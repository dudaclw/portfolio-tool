import { describe, expect, it } from 'vitest';
import { criarItem, type ItemBacklog } from '../backlog/item-backlog';
import { ErroDeRegra } from '../compartilhado/erro-de-regra';
import { calcularVelocity } from '../metricas/velocity';
import { encerrarSprint } from './encerramento';
import { criarSprint, type ItemNaSprint, type Sprint } from './sprint';

const AGORA = '2026-10-13T18:00:00Z';

const item = (id: string, ordem: number, parcial: Partial<ItemBacklog> = {}): ItemBacklog => ({
  ...criarItem(id, 'p1', { titulo: id, estimativa: 5 }, ordem),
  estado: 'pronto_para_sprint',
  ...parcial,
});

const naSprint = (
  itemId: string,
  estimativaPlanejada: number,
  resultado: ItemNaSprint['resultado'],
): ItemNaSprint => ({
  itemId,
  estimativaPlanejada,
  adicionadoEm: '2026-09-29T09:00:00Z',
  resultado,
});

const sprintAtiva = (itens: ItemNaSprint[]): Sprint => ({
  ...criarSprint('s2', 'p1', 2, '2026-09-29', 15),
  meta: 'Meta',
  situacao: 'ativa',
  itens,
});

describe('RN-06: velocity', () => {
  it('itens planejados com 5, 3 e 8 pontos; aceitos os de 5 e 3 → velocity 8', () => {
    const itens = [
      naSprint('a', 5, 'aceito'),
      naSprint('b', 3, 'aceito'),
      naSprint('c', 8, 'nao_aceito'),
    ];
    expect(calcularVelocity(itens)).toBe(8);
  });

  it('reestimar o de 5 para 13 depois não altera a velocity (vale a estimativa planejada)', () => {
    const sprint = sprintAtiva([
      naSprint('a', 5, 'aceito'),
      naSprint('b', 3, 'aceito'),
      naSprint('c', 8, 'nao_aceito'),
    ]);
    const itens = [
      item('a', 1, { estado: 'concluido', sprintId: 's2', estimativa: 13 }),
      item('b', 2, { estado: 'concluido', sprintId: 's2' }),
      item('c', 3, { sprintId: 's2', estado: 'em_revisao' }),
    ];
    expect(encerrarSprint(sprint, itens, AGORA).sprint.velocity).toBe(8);
  });

  it('sem nenhum aceito a velocity é 0', () => {
    expect(calcularVelocity([naSprint('a', 5, 'nao_aceito'), naSprint('b', 3, null)])).toBe(0);
  });
});

describe('RN-05: encerrar devolve ao topo do backlog os itens não aceitos', () => {
  it('A aceito e B não aceito: B volta ao topo como pronto_para_sprint; A continua concluído', () => {
    const sprint = sprintAtiva([naSprint('A', 5, 'aceito'), naSprint('B', 3, 'nao_aceito')]);
    const itens = [
      item('A', 1, { estado: 'concluido', sprintId: 's2' }),
      item('B', 2, { estado: 'em_andamento', sprintId: 's2' }),
      item('X', 3),
      item('Y', 4),
    ];
    const { itensAlterados, historico, sprint: encerrada } = encerrarSprint(sprint, itens, AGORA);

    const final = new Map(itensAlterados.map((i) => [i.id, i]));
    expect(final.get('B')).toMatchObject({
      ordem: 1,
      estado: 'pronto_para_sprint',
      sprintId: null,
    });
    expect(final.has('A')).toBe(true); // só mudou de posição
    expect(final.get('A')).toMatchObject({ ordem: 2, estado: 'concluido', sprintId: 's2' });
    expect(final.has('X')).toBe(false); // já estava em 3
    expect(final.has('Y')).toBe(false); // já estava em 4

    expect(historico).toEqual([
      { itemId: 'B', de: 'em_andamento', para: 'pronto_para_sprint', em: AGORA },
    ]);
    expect(encerrada.situacao).toBe('encerrada');
  });

  it('os devolvidos mantêm a ordem relativa que tinham, antes dos demais', () => {
    const sprint = sprintAtiva([
      naSprint('A', 5, 'nao_aceito'),
      naSprint('B', 5, 'aceito'),
      naSprint('C', 5, 'nao_aceito'),
    ]);
    const itens = [
      item('B', 1, { estado: 'concluido', sprintId: 's2' }),
      item('C', 2, { sprintId: 's2' }),
      item('A', 3, { sprintId: 's2' }),
      item('X', 4),
    ];
    const { itensAlterados } = encerrarSprint(sprint, itens, AGORA);
    const ordemFinal = [...itens.map((i) => itensAlterados.find((a) => a.id === i.id) ?? i)]
      .sort((a, b) => a.ordem - b.ordem)
      .map((i) => i.id);
    expect(ordemFinal).toEqual(['C', 'A', 'B', 'X']);
  });

  it('as posições do projeto continuam de 1 a N', () => {
    const sprint = sprintAtiva([naSprint('B', 3, 'nao_aceito')]);
    const itens = [
      item('A', 1, { estado: 'concluido' }),
      item('B', 2, { sprintId: 's2' }),
      item('X', 3),
    ];
    const { itensAlterados } = encerrarSprint(sprint, itens, AGORA);
    const ordens = itens
      .map((i) => itensAlterados.find((a) => a.id === i.id) ?? i)
      .map((i) => i.ordem)
      .sort((a, b) => a - b);
    expect(ordens).toEqual([1, 2, 3]);
  });

  it('item sem resultado registrado conta como não aceito: volta ao backlog e fica nao_aceito no registro', () => {
    const sprint = sprintAtiva([naSprint('A', 5, null)]);
    const { sprint: encerrada, itensAlterados } = encerrarSprint(
      sprint,
      [item('A', 1, { sprintId: 's2' })],
      AGORA,
    );
    expect(encerrada.itens[0]?.resultado).toBe('nao_aceito');
    expect(encerrada.velocity).toBe(0);
    expect(itensAlterados[0]).toMatchObject({ id: 'A', sprintId: null });
  });

  it('item já em pronto_para_sprint que volta não gera histórico', () => {
    const sprint = sprintAtiva([naSprint('A', 5, 'nao_aceito')]);
    const { historico } = encerrarSprint(sprint, [item('A', 1, { sprintId: 's2' })], AGORA);
    expect(historico).toEqual([]);
  });

  it('só encerra sprint ativa', () => {
    for (const situacao of ['planejada', 'encerrada'] as const) {
      const erro = (() => {
        try {
          encerrarSprint({ ...sprintAtiva([]), situacao }, [], AGORA);
        } catch (e) {
          return e;
        }
      })();
      expect(erro).toBeInstanceOf(ErroDeRegra);
      expect((erro as ErroDeRegra).codigo).toBe('SPRINT-NAO-ATIVA');
    }
  });

  it('não altera a sprint nem os itens recebidos', () => {
    const sprint = sprintAtiva([naSprint('A', 5, null)]);
    const itens = [item('A', 1, { sprintId: 's2' })];
    encerrarSprint(sprint, itens, AGORA);
    expect(sprint.situacao).toBe('ativa');
    expect(sprint.itens[0]?.resultado).toBeNull();
    expect(itens[0]?.sprintId).toBe('s2');
  });
});
