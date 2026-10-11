import { describe, expect, it } from 'vitest';
import { criarItem, type ItemBacklog } from '../backlog/item-backlog';
import { ErroDeRegra } from '../compartilhado/erro-de-regra';
import { ErroDeValidacao } from '../compartilhado/erro-de-validacao';
import {
  alterarDatasDaSprint,
  criarSprint,
  iniciarSprint,
  planejarSprint,
  type Sprint,
} from './sprint';

const AGORA = '2026-10-09T12:00:00Z';

function codigoDe(acao: () => unknown): string | undefined {
  try {
    acao();
  } catch (erro) {
    if (erro instanceof ErroDeRegra) return erro.codigo;
    throw erro;
  }
  return undefined;
}

const sprint = (parcial: Partial<Sprint> = {}): Sprint => ({
  ...criarSprint('s1', 'p1', 1, '2026-10-19', 15),
  ...parcial,
});

const item = (id: string, parcial: Partial<ItemBacklog> = {}): ItemBacklog => ({
  ...criarItem(id, 'p1', { titulo: `Item ${id}`, estimativa: 5 }, 1),
  estado: 'pronto_para_sprint',
  ...parcial,
});

describe('criarSprint', () => {
  it('nasce planejada, sem meta e sem itens, e o fim vem da duração', () => {
    expect(criarSprint('s1', 'p1', 1, '2026-10-19', 15)).toEqual({
      id: 's1',
      projetoId: 'p1',
      numero: 1,
      inicio: '2026-10-19',
      fim: '2026-11-02',
      meta: '',
      situacao: 'planejada',
      itens: [],
      velocity: null,
    });
  });

  it('recusa data de início inválida', () => {
    expect(() => criarSprint('s', 'p', 1, '19/10/2026', 15)).toThrow(ErroDeValidacao);
  });
});

describe('RN-01: as datas não mudam depois que a sprint inicia', () => {
  it('sprint ativa: alterar o fim é recusado com RN-01', () => {
    expect(
      codigoDe(() => alterarDatasDaSprint(sprint({ situacao: 'ativa' }), { fim: '2026-11-10' })),
    ).toBe('RN-01');
  });

  it('sprint encerrada também', () => {
    expect(
      codigoDe(() =>
        alterarDatasDaSprint(sprint({ situacao: 'encerrada' }), { inicio: '2026-10-20' }),
      ),
    ).toBe('RN-01');
  });

  it('sprint planejada aceita novas datas', () => {
    const alterada = alterarDatasDaSprint(sprint(), { inicio: '2026-10-20', fim: '2026-11-03' });
    expect([alterada.inicio, alterada.fim]).toEqual(['2026-10-20', '2026-11-03']);
  });

  it('recusa fim anterior ao início e data inexistente (validação)', () => {
    expect(() => alterarDatasDaSprint(sprint(), { fim: '2026-10-01' })).toThrow(ErroDeValidacao);
    expect(() => alterarDatasDaSprint(sprint(), { inicio: '2026-02-30' })).toThrow(ErroDeValidacao);
  });
});

describe('RN-10: só itens pronto_para_sprint entram na sprint', () => {
  it('adicionar item novo é recusado com RN-10', () => {
    const novo = item('a', { estado: 'novo' });
    expect(codigoDe(() => planejarSprint(sprint(), [novo], 'Meta', ['a'], AGORA))).toBe('RN-10');
  });

  it('item refinado também é recusado', () => {
    const refinado = item('a', { estado: 'refinado' });
    expect(codigoDe(() => planejarSprint(sprint(), [refinado], 'Meta', ['a'], AGORA))).toBe(
      'RN-10',
    );
  });

  it('item pronto entra: ganha o sprintId e a estimativa planejada é a de agora', () => {
    const { sprint: planejada, itensAlterados } = planejarSprint(
      sprint(),
      [item('a', { estimativa: 8 })],
      '  Cliente abre chamados ',
      ['a'],
      AGORA,
    );
    expect(planejada.meta).toBe('Cliente abre chamados');
    expect(planejada.itens).toEqual([
      { itemId: 'a', estimativaPlanejada: 8, adicionadoEm: AGORA, resultado: null },
    ]);
    expect(itensAlterados).toEqual([expect.objectContaining({ id: 'a', sprintId: 's1' })]);
  });

  it('item sem estimativa entra valendo 0 ponto', () => {
    const { sprint: planejada } = planejarSprint(
      sprint(),
      [item('a', { estimativa: null })],
      'Meta',
      ['a'],
      AGORA,
    );
    expect(planejada.itens[0]?.estimativaPlanejada).toBe(0);
  });

  it('item que já está em outra sprint é recusado', () => {
    const emOutra = item('a', { sprintId: 's9' });
    expect(codigoDe(() => planejarSprint(sprint(), [emOutra], 'Meta', ['a'], AGORA))).toBe(
      'ITEM-EM-SPRINT',
    );
  });

  it('id que não existe no projeto é validação (422), não regra', () => {
    expect(() => planejarSprint(sprint(), [item('a')], 'Meta', ['fantasma'], AGORA)).toThrow(
      ErroDeValidacao,
    );
  });

  it('ids repetidos entram uma vez só', () => {
    const { sprint: planejada } = planejarSprint(sprint(), [item('a')], 'M', ['a', 'a'], AGORA);
    expect(planejada.itens).toHaveLength(1);
  });

  it('a recusa não altera a sprint recebida', () => {
    const original = sprint();
    expect(() =>
      planejarSprint(original, [item('a', { estado: 'novo' })], 'M', ['a'], AGORA),
    ).toThrow();
    expect(original.itens).toEqual([]);
  });
});

describe('planejamento: tirar itens da sprint', () => {
  const comItem = (estado: ItemBacklog['estado']) => {
    const dentro = item('a', { sprintId: 's1', estado });
    const ativa = sprint({
      situacao: 'ativa',
      meta: 'Meta',
      itens: [{ itemId: 'a', estimativaPlanejada: 5, adicionadoEm: AGORA, resultado: null }],
    });
    return { dentro, ativa };
  };

  it('o item que sai volta ao backlog em pronto_para_sprint, sem sprint', () => {
    const { dentro, ativa } = comItem('pronto_para_sprint');
    const resultado = planejarSprint(ativa, [dentro], 'Meta', [], AGORA);
    expect(resultado.sprint.itens).toEqual([]);
    expect(resultado.itensAlterados).toEqual([
      expect.objectContaining({ id: 'a', sprintId: null, estado: 'pronto_para_sprint' }),
    ]);
    expect(resultado.historico).toEqual([]);
  });

  it('se estava em andamento, o histórico registra a volta a pronto_para_sprint', () => {
    const { dentro, ativa } = comItem('em_andamento');
    const resultado = planejarSprint(ativa, [dentro], 'Meta', [], AGORA);
    expect(resultado.historico).toEqual([
      { itemId: 'a', de: 'em_andamento', para: 'pronto_para_sprint', em: AGORA },
    ]);
  });

  it('quem continua na sprint não é revalidado nem perde a estimativa planejada', () => {
    const { dentro, ativa } = comItem('em_andamento');
    const reestimado = { ...dentro, estimativa: 13 };
    const resultado = planejarSprint(ativa, [reestimado], 'Meta', ['a'], AGORA);
    expect(resultado.sprint.itens[0]).toMatchObject({ itemId: 'a', estimativaPlanejada: 5 });
    expect(resultado.itensAlterados).toEqual([]);
  });
});

describe('RN-03: a meta não muda com a sprint ativa; itens podem entrar e sair', () => {
  const ativa = sprint({
    situacao: 'ativa',
    meta: 'Cliente abre e acompanha chamados',
    itens: [{ itemId: 'a', estimativaPlanejada: 5, adicionadoEm: AGORA, resultado: null }],
  });
  const dentro = item('a', { sprintId: 's1' });

  it('editar a meta de sprint ativa é recusado com RN-03', () => {
    expect(codigoDe(() => planejarSprint(ativa, [dentro], 'Outra meta', ['a'], AGORA))).toBe(
      'RN-03',
    );
  });

  it('adicionar item a sprint ativa é permitido', () => {
    const novo = item('b');
    const { sprint: depois } = planejarSprint(
      ativa,
      [dentro, novo],
      'Cliente abre e acompanha chamados',
      ['a', 'b'],
      AGORA,
    );
    expect(depois.itens.map((i) => i.itemId)).toEqual(['a', 'b']);
  });

  it('repetir a mesma meta (com espaços nas pontas) não é "mudar"', () => {
    expect(() =>
      planejarSprint(ativa, [dentro], '  Cliente abre e acompanha chamados ', ['a'], AGORA),
    ).not.toThrow();
  });

  it('sprint planejada aceita trocar a meta', () => {
    const { sprint: depois } = planejarSprint(sprint({ meta: 'Antiga' }), [], 'Nova', [], AGORA);
    expect(depois.meta).toBe('Nova');
  });

  it('sprint encerrada não é mais planejada', () => {
    expect(
      codigoDe(() => planejarSprint(sprint({ situacao: 'encerrada' }), [], '', [], AGORA)),
    ).toBe('SPRINT-ENCERRADA');
  });
});

describe('iniciarSprint', () => {
  const pronta = (parcial: Partial<Sprint> = {}) =>
    sprint({
      numero: 2,
      id: 's2',
      meta: 'Meta',
      itens: [{ itemId: 'a', estimativaPlanejada: 5, adicionadoEm: AGORA, resultado: null }],
      ...parcial,
    });

  it('torna a sprint ativa', () => {
    expect(iniciarSprint(pronta(), []).situacao).toBe('ativa');
  });

  it('RN-02: com a sprint 1 ativa, iniciar a sprint 2 é recusado', () => {
    const ativa1 = sprint({ situacao: 'ativa' });
    expect(codigoDe(() => iniciarSprint(pronta(), [ativa1]))).toBe('RN-02');
  });

  it('RN-02 vem antes de RN-10: sprint nova (sem meta e sem itens) com outra ativa mostra RN-02', () => {
    const ativa = sprint({ situacao: 'ativa' });
    const vazia = sprint({ id: 's4', numero: 4 });
    expect(codigoDe(() => iniciarSprint(vazia, [ativa]))).toBe('RN-02');
  });

  it('sprints encerradas e planejadas não bloqueiam', () => {
    const outras = [sprint({ situacao: 'encerrada' }), sprint({ id: 's3', numero: 3 })];
    expect(iniciarSprint(pronta(), outras).situacao).toBe('ativa');
  });

  it('RN-10: sem meta é recusado, e meta só com espaços também', () => {
    expect(codigoDe(() => iniciarSprint(pronta({ meta: '' }), []))).toBe('RN-10');
    expect(codigoDe(() => iniciarSprint(pronta({ meta: '   ' }), []))).toBe('RN-10');
  });

  it('RN-10: sem itens é recusado', () => {
    expect(codigoDe(() => iniciarSprint(pronta({ itens: [] }), []))).toBe('RN-10');
  });

  it('só inicia sprint planejada', () => {
    expect(codigoDe(() => iniciarSprint(pronta({ situacao: 'ativa' }), []))).toBe(
      'SPRINT-NAO-PLANEJADA',
    );
    expect(codigoDe(() => iniciarSprint(pronta({ situacao: 'encerrada' }), []))).toBe(
      'SPRINT-NAO-PLANEJADA',
    );
  });
});
