import { beforeEach, describe, expect, it } from 'vitest';
import { ErroNaoEncontrado } from '@/aplicacao/erros';
import { ErroDeRegra } from '@/dominio/compartilhado/erro-de-regra';
import { ErroDeValidacao } from '@/dominio/compartilhado/erro-de-validacao';
import { criarContainer, type Container } from '@/infra/container';

let container: Container;
let backlog: Container['backlog'];
let sprints: Container['sprints'];
let relogio: string;
let projetoId: string;

beforeEach(async () => {
  let n = 0;
  relogio = '2026-10-09T12:00:00Z';
  container = criarContainer({
    armazenamento: { tipo: 'memoria' },
    relogio: () => relogio,
    gerarId: () => `id${++n}`,
  });
  backlog = container.backlog;
  sprints = container.sprints;
  projetoId = (
    await container.projetos.criar({
      nome: 'Portal',
      inicio: '2026-09-14',
      fimPrevisto: '2026-12-18',
    })
  ).id;
});

/** Cria um item e o deixa pronto para sprint. */
async function itemPronto(titulo: string, estimativa: number | null = 5) {
  const item = await backlog.criar(projetoId, { titulo, estimativa });
  return backlog.transicionar(item.id, 'pronto_para_sprint');
}

const codigoDe = async (promessa: Promise<unknown>) => {
  try {
    await promessa;
  } catch (erro) {
    if (erro instanceof ErroDeRegra) return erro.codigo;
    throw erro;
  }
  return undefined;
};

describe('criar sprint', () => {
  it('a primeira começa no início do projeto e termina pela duração (15 dias)', async () => {
    expect(await sprints.criar(projetoId)).toMatchObject({
      numero: 1,
      inicio: '2026-09-14',
      fim: '2026-09-28',
      situacao: 'planejada',
      meta: '',
      itens: [],
      velocity: null,
    });
  });

  it('as seguintes começam no dia seguinte ao fim da anterior e são numeradas em sequência', async () => {
    await sprints.criar(projetoId);
    expect(await sprints.criar(projetoId)).toMatchObject({
      numero: 2,
      inicio: '2026-09-29',
      fim: '2026-10-13',
    });
    expect(await sprints.criar(projetoId)).toMatchObject({ numero: 3, inicio: '2026-10-14' });
  });

  it('respeita a duração do projeto e aceita um início escolhido', async () => {
    await container.projetos.editar(projetoId, { duracaoSprintDias: 10 });
    expect(await sprints.criar(projetoId, { inicio: '2026-10-19' })).toMatchObject({
      inicio: '2026-10-19',
      fim: '2026-10-28',
    });
  });

  it('projeto inexistente: 404; data de início inválida: validação', async () => {
    await expect(sprints.criar('nada')).rejects.toBeInstanceOf(ErroNaoEncontrado);
    await expect(sprints.criar(projetoId, { inicio: '2026-02-30' })).rejects.toBeInstanceOf(
      ErroDeValidacao,
    );
  });

  it('lista em ordem de número; 404 em projeto inexistente', async () => {
    await sprints.criar(projetoId);
    await sprints.criar(projetoId);
    expect((await sprints.listarPorProjeto(projetoId)).map((s) => s.numero)).toEqual([1, 2]);
    await expect(sprints.listarPorProjeto('nada')).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });
});

describe('planejar', () => {
  it('guarda a meta e leva os itens para a sprint (sprintId, estimativa planejada, instante)', async () => {
    const sprint = await sprints.criar(projetoId);
    const a = await itemPronto('A', 5);
    await sprints.planejar(sprint.id, { meta: 'Cliente abre chamados', itemIds: [a.id] });

    const lida = await sprints.obter(sprint.id);
    expect(lida.meta).toBe('Cliente abre chamados');
    expect(lida.itens).toEqual([
      { itemId: a.id, estimativaPlanejada: 5, adicionadoEm: relogio, resultado: null },
    ]);
    expect((await backlog.obter(a.id)).sprintId).toBe(sprint.id);
  });

  it('item novo é recusado com RN-10 e nada é gravado', async () => {
    const sprint = await sprints.criar(projetoId);
    const pronto = await itemPronto('Pronto');
    const novo = await backlog.criar(projetoId, { titulo: 'Novo', estimativa: 3 });
    expect(
      await codigoDe(sprints.planejar(sprint.id, { meta: 'M', itemIds: [pronto.id, novo.id] })),
    ).toBe('RN-10');
    expect((await sprints.obter(sprint.id)).itens).toEqual([]);
    expect((await backlog.obter(pronto.id)).sprintId).toBeNull();
  });

  it('item de outro projeto é validação (422)', async () => {
    const outro = await container.projetos.criar({
      nome: 'Outro',
      inicio: '2026-11-02',
      fimPrevisto: '2027-02-26',
    });
    const estranho = await backlog.criar(outro.id, { titulo: 'Estranho' });
    const sprint = await sprints.criar(projetoId);
    await expect(
      sprints.planejar(sprint.id, { meta: 'M', itemIds: [estranho.id] }),
    ).rejects.toBeInstanceOf(ErroDeValidacao);
  });

  it('tirar um item o devolve ao backlog como pronto_para_sprint', async () => {
    const sprint = await sprints.criar(projetoId);
    const a = await itemPronto('A');
    const b = await itemPronto('B');
    await sprints.planejar(sprint.id, { meta: 'M', itemIds: [a.id, b.id] });
    await sprints.planejar(sprint.id, { meta: 'M', itemIds: [b.id] });
    expect((await sprints.obter(sprint.id)).itens.map((i) => i.itemId)).toEqual([b.id]);
    expect(await backlog.obter(a.id)).toMatchObject({
      sprintId: null,
      estado: 'pronto_para_sprint',
    });
  });

  it('sprint inexistente: 404', async () => {
    await expect(sprints.planejar('nada', { meta: 'M', itemIds: [] })).rejects.toBeInstanceOf(
      ErroNaoEncontrado,
    );
  });
});

describe('iniciar', () => {
  async function sprintPronta() {
    const sprint = await sprints.criar(projetoId);
    const item = await itemPronto('A');
    await sprints.planejar(sprint.id, { meta: 'Meta', itemIds: [item.id] });
    return { sprint, item };
  }

  it('torna a sprint ativa', async () => {
    const { sprint } = await sprintPronta();
    expect((await sprints.iniciar(sprint.id)).situacao).toBe('ativa');
    expect((await sprints.obter(sprint.id)).situacao).toBe('ativa');
  });

  it('RN-10: sem meta ou sem itens é recusado e a sprint continua planejada', async () => {
    const semMeta = await sprints.criar(projetoId);
    const item = await itemPronto('A');
    await sprints.planejar(semMeta.id, { meta: '', itemIds: [item.id] });
    expect(await codigoDe(sprints.iniciar(semMeta.id))).toBe('RN-10');

    const semItens = await sprints.criar(projetoId);
    await sprints.planejar(semItens.id, { meta: 'M', itemIds: [] });
    expect(await codigoDe(sprints.iniciar(semItens.id))).toBe('RN-10');
    expect((await sprints.obter(semItens.id)).situacao).toBe('planejada');
  });

  it('RN-02: com a sprint 1 ativa, iniciar a sprint 2 é recusado', async () => {
    const { sprint: primeira } = await sprintPronta();
    await sprints.iniciar(primeira.id);

    const segunda = await sprints.criar(projetoId);
    const b = await itemPronto('B');
    await sprints.planejar(segunda.id, { meta: 'Outra', itemIds: [b.id] });
    expect(await codigoDe(sprints.iniciar(segunda.id))).toBe('RN-02');
    expect((await sprints.obter(segunda.id)).situacao).toBe('planejada');
  });
});

describe('RN-01 e RN-03 na sprint ativa', () => {
  async function sprintAtiva() {
    const sprint = await sprints.criar(projetoId);
    const item = await itemPronto('A');
    await sprints.planejar(sprint.id, { meta: 'Meta original', itemIds: [item.id] });
    await sprints.iniciar(sprint.id);
    return { sprint, item };
  }

  it('RN-01: alterar o fim de sprint ativa é recusado', async () => {
    const { sprint } = await sprintAtiva();
    expect(await codigoDe(sprints.alterarDatas(sprint.id, { fim: '2026-11-10' }))).toBe('RN-01');
    expect((await sprints.obter(sprint.id)).fim).toBe('2026-09-28');
  });

  it('RN-01: sprint planejada aceita novas datas', async () => {
    const sprint = await sprints.criar(projetoId);
    const alterada = await sprints.alterarDatas(sprint.id, {
      inicio: '2026-09-15',
      fim: '2026-09-29',
    });
    expect([alterada.inicio, alterada.fim]).toEqual(['2026-09-15', '2026-09-29']);
  });

  it('RN-03: editar a meta é recusado, mas adicionar item é permitido', async () => {
    const { sprint, item } = await sprintAtiva();
    const extra = await itemPronto('B', 3);
    expect(
      await codigoDe(sprints.planejar(sprint.id, { meta: 'Outra meta', itemIds: [item.id] })),
    ).toBe('RN-03');

    await sprints.planejar(sprint.id, { meta: 'Meta original', itemIds: [item.id, extra.id] });
    expect((await sprints.obter(sprint.id)).itens).toHaveLength(2);
    expect((await sprints.obter(sprint.id)).meta).toBe('Meta original');
  });

  it('tirar da sprint ativa um item em andamento grava a volta a pronto_para_sprint no histórico', async () => {
    const { sprint, item } = await sprintAtiva();
    await backlog.transicionar(item.id, 'em_andamento');
    await sprints.planejar(sprint.id, { meta: 'Meta original', itemIds: [] });
    const lido = await backlog.obter(item.id);
    expect(lido).toMatchObject({ estado: 'pronto_para_sprint', sprintId: null });
    expect(lido.historico.at(-1)).toMatchObject({ de: 'em_andamento', para: 'pronto_para_sprint' });
  });
});

describe('dias úteis restantes', () => {
  it('só a sprint ativa tem; usa os feriados cadastrados e a data do relógio', async () => {
    const sprint = await sprints.criar(projetoId, { inicio: '2026-09-29' });
    expect((await sprints.obter(sprint.id)).diasUteisRestantes).toBeNull();

    const item = await itemPronto('A');
    await sprints.planejar(sprint.id, { meta: 'M', itemIds: [item.id] });
    await sprints.iniciar(sprint.id);
    expect((await sprints.obter(sprint.id)).diasUteisRestantes).toBe(3); // 09, 12 e 13/10

    await container.banco.escrever((dados) => {
      dados.feriados.push({ data: '2026-10-12', nome: 'Nossa Senhora Aparecida' });
    });
    expect((await sprints.obter(sprint.id)).diasUteisRestantes).toBe(2);
  });
});

describe('transações', () => {
  it('uma recusa no planejamento não deixa item pela metade', async () => {
    const sprint = await sprints.criar(projetoId);
    const a = await itemPronto('A');
    const novo = await backlog.criar(projetoId, { titulo: 'Novo' });
    // `a` é válido e entraria; `novo` derruba o planejamento inteiro
    await expect(
      sprints.planejar(sprint.id, { meta: 'M', itemIds: [a.id, novo.id] }),
    ).rejects.toBeInstanceOf(ErroDeRegra);
    expect((await backlog.obter(a.id)).sprintId).toBeNull();
  });
});
