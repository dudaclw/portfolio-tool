import { beforeEach, describe, expect, it } from 'vitest';
import { criarCasosDeUsoDeSprints } from '@/aplicacao/sprints/casos-de-uso';
import type { RepositorioItens } from '@/aplicacao/portas';
import { ErroDeRegra } from '@/dominio/compartilhado/erro-de-regra';
import { ErroDeValidacao } from '@/dominio/compartilhado/erro-de-validacao';
import { criarContainer, type Container } from '@/infra/container';

let container: Container;
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
  projetoId = (
    await container.projetos.criar({
      nome: 'Portal',
      inicio: '2026-09-14',
      fimPrevisto: '2026-12-18',
    })
  ).id;
});

/** Sprint ativa com itens de 5, 3 e 8 pontos (A, B, C) e um item X no backlog. */
async function sprintAtivaComTresItens() {
  const { backlog, sprints } = container;
  const criar = async (titulo: string, estimativa: number) => {
    const item = await backlog.criar(projetoId, { titulo, estimativa });
    return backlog.transicionar(item.id, 'pronto_para_sprint');
  };
  const a = await criar('A', 5);
  const b = await criar('B', 3);
  const c = await criar('C', 8);
  const x = await criar('X', 2);
  const sprint = await sprints.criar(projetoId);
  await sprints.planejar(sprint.id, { meta: 'Meta', itemIds: [a.id, b.id, c.id] });
  await sprints.iniciar(sprint.id);
  return { sprint, a, b, c, x };
}

const concluir = async (id: string) => {
  const { definicaoDePronto } = await container.projetos.obter(projetoId);
  await container.backlog.definirCriteriosCumpridos(id, definicaoDePronto);
  await container.backlog.transicionar(id, 'concluido');
};

describe('review', () => {
  it('registra aceite e feedback; só aceita item concluído', async () => {
    const { sprint, a, b } = await sprintAtivaComTresItens();
    await concluir(a.id);
    await expect(
      container.sprints.registrarReview(sprint.id, [{ itemId: b.id, resultado: 'aceito' }]),
    ).rejects.toMatchObject({ codigo: 'ITEM-NAO-CONCLUIDO' });

    const depois = await container.sprints.registrarReview(sprint.id, [
      { itemId: a.id, resultado: 'aceito', feedback: 'Ótimo' },
      { itemId: b.id, resultado: 'nao_aceito' },
    ]);
    expect(depois.itens.map((i) => i.resultado)).toEqual(['aceito', 'nao_aceito', null]);
    expect(depois.itens[0]?.feedbackReview).toBe('Ótimo');
  });

  it('sprint planejada: recusado (SPRINT-NAO-ATIVA)', async () => {
    const sprint = await container.sprints.criar(projetoId);
    await expect(container.sprints.registrarReview(sprint.id, [])).rejects.toMatchObject({
      codigo: 'SPRINT-NAO-ATIVA',
    });
  });
});

describe('retrospectiva', () => {
  it('salva com ação, e a ação precisa de responsável cadastrado', async () => {
    const { sprint } = await sprintAtivaComTresItens();
    await expect(
      container.sprints.salvarRetrospectiva(sprint.id, {
        bem: [],
        melhorar: [],
        acoes: [{ descricao: 'X', responsavelId: 'fantasma' }],
      }),
    ).rejects.toBeInstanceOf(ErroDeValidacao);

    await container.repositorios.pessoas.salvar({
      id: 'ana',
      nome: 'Ana',
      funcao: 'Dev',
      jornadaSemanalHoras: 40,
    });
    const salva = await container.sprints.salvarRetrospectiva(sprint.id, {
      bem: ['Entrega'],
      melhorar: ['Revisão'],
      acoes: [{ descricao: 'Revisar em duplas', responsavelId: 'ana', prazo: '2026-10-20' }],
    });
    expect(salva.retrospectiva?.acoes[0]).toMatchObject({
      descricao: 'Revisar em duplas',
      responsavelId: 'ana',
      concluida: false,
    });
    expect((await container.sprints.obter(sprint.id)).retrospectiva).toEqual(salva.retrospectiva);
  });
});

describe('encerrar', () => {
  it('RN-06 e RN-05: velocity só dos aceitos; os outros voltam ao topo como pronto_para_sprint', async () => {
    const { sprint, a, b, c, x } = await sprintAtivaComTresItens();
    await concluir(a.id);
    await concluir(b.id);
    await container.backlog.transicionar(c.id, 'em_andamento');
    await container.sprints.registrarReview(sprint.id, [
      { itemId: a.id, resultado: 'aceito' },
      { itemId: b.id, resultado: 'aceito' },
      { itemId: c.id, resultado: 'nao_aceito' },
    ]);
    // reestimar depois não muda a velocity
    await container.backlog.editar(a.id, { estimativa: 13 });

    const encerrada = await container.sprints.encerrar(sprint.id);
    expect(encerrada).toMatchObject({ situacao: 'encerrada', velocity: 8 });

    const lista = await container.backlog.listarPorProjeto(projetoId);
    expect(lista.map((i) => i.titulo)).toEqual(['C', 'A', 'B', 'X']);
    expect(lista.map((i) => i.ordem)).toEqual([1, 2, 3, 4]);
    const porTitulo = Object.fromEntries(lista.map((i) => [i.titulo, i]));
    expect(porTitulo.C).toMatchObject({ estado: 'pronto_para_sprint', sprintId: null });
    expect(porTitulo.A).toMatchObject({ estado: 'concluido', sprintId: sprint.id });
    expect(porTitulo.X).toMatchObject({ sprintId: null });
    expect(x.id).toBe(porTitulo.X?.id);

    const historicoDeC = (await container.backlog.obter(c.id)).historico.at(-1);
    expect(historicoDeC).toMatchObject({ de: 'em_andamento', para: 'pronto_para_sprint' });
  });

  it('depois de encerrada, uma nova sprint pode ser iniciada (RN-02 liberada)', async () => {
    const { sprint } = await sprintAtivaComTresItens();
    await container.sprints.encerrar(sprint.id);
    const lista = await container.backlog.listarPorProjeto(projetoId);
    const segunda = await container.sprints.criar(projetoId);
    await container.sprints.planejar(segunda.id, {
      meta: 'Próxima',
      itemIds: [lista[0]!.id],
    });
    expect((await container.sprints.iniciar(segunda.id)).situacao).toBe('ativa');
  });

  it('encerrar de novo, ou sprint planejada, é recusado', async () => {
    const { sprint } = await sprintAtivaComTresItens();
    await container.sprints.encerrar(sprint.id);
    await expect(container.sprints.encerrar(sprint.id)).rejects.toBeInstanceOf(ErroDeRegra);
    const planejada = await container.sprints.criar(projetoId);
    await expect(container.sprints.encerrar(planejada.id)).rejects.toMatchObject({
      codigo: 'SPRINT-NAO-ATIVA',
    });
  });

  it('falha simulada no meio do encerramento não altera nada', async () => {
    const { sprint, a, b, c } = await sprintAtivaComTresItens();
    await concluir(a.id);
    await container.sprints.registrarReview(sprint.id, [{ itemId: a.id, resultado: 'aceito' }]);

    const antes = {
      itens: await container.backlog.listarPorProjeto(projetoId),
      sprint: await container.sprints.obter(sprint.id),
      historico: structuredClone((await container.banco.ler()).historico),
    };

    // Repositório de itens que lança erro na segunda gravação, no meio do encerramento.
    const reais = container.repositorios.itens;
    let gravacoes = 0;
    const itensQueFalham: RepositorioItens = {
      listar: () => reais.listar(),
      obter: (id) => reais.obter(id),
      remover: (id) => reais.remover(id),
      listarPorProjeto: (id) => reais.listarPorProjeto(id),
      salvar: async (item) => {
        if (++gravacoes === 2) throw new Error('disco cheio');
        await reais.salvar(item);
      },
    };
    const comFalha = criarCasosDeUsoDeSprints({
      projetos: container.repositorios.projetos,
      pessoas: container.repositorios.pessoas,
      sprints: container.repositorios.sprints,
      itens: itensQueFalham,
      historico: container.repositorios.historico,
      feriados: container.repositorios.feriados,
      transacao: container.transacao,
      agora: container.agora,
      gerarId: () => 'x',
    });

    await expect(comFalha.encerrar(sprint.id)).rejects.toThrow('disco cheio');
    expect(gravacoes).toBe(2); // a primeira gravação aconteceu dentro da transação e foi desfeita

    expect(await container.backlog.listarPorProjeto(projetoId)).toEqual(antes.itens);
    expect(await container.sprints.obter(sprint.id)).toEqual(antes.sprint);
    expect((await container.banco.ler()).historico).toEqual(antes.historico);
    expect([b.id, c.id]).toHaveLength(2);
  });
});
