import { describe, expect, it } from 'vitest';
import { ErroNaoEncontrado } from '@/aplicacao/erros';
import { criarContainer } from '@/infra/container';
import { montarDadosDeExemplo } from '@/infra/seed/dados-de-exemplo';

/** Container sobre os dados de exemplo, com "hoje" fixo (como no roteiro de aceite). */
function comDadosDeExemplo(hoje = '2026-10-09T12:00:00Z') {
  let n = 0;
  const dados = montarDadosDeExemplo(() => `ex-${++n}`);
  return criarContainer({
    armazenamento: { tipo: 'memoria', dados },
    relogio: () => hoje,
    gerarId: () => `novo-${++n}`,
  });
}

describe('portfólio (roteiro de aceite, passo 1)', () => {
  it('Portal do Cliente: ≈ 29%, 1 item sem estimativa, sprint 2 ativa com 2 dias úteis restantes', async () => {
    const { hoje, projetos } = await comDadosDeExemplo().metricas.portfolio();
    expect(hoje).toBe('2026-10-09');
    expect(projetos.map((p) => p.nome)).toEqual(['Portal do Cliente', 'Migração do RH']);

    const [portal, migracao] = projetos;
    expect(portal?.progresso).toEqual({
      pontosConcluidos: 21,
      pontosTotais: 73,
      percentual: 29,
      semEstimativa: 1,
    });
    expect(portal?.sprintAtual).toMatchObject({ numero: 2, diasUteisRestantes: 2 }); // 09/10 e 13/10
    expect(portal?.sprints.map((s) => [s.numero, s.situacao])).toEqual([
      [1, 'encerrada'],
      [2, 'ativa'],
      [3, 'planejada'],
    ]);
    expect(migracao?.sprintAtual).toBeNull();
    expect(migracao?.progresso.percentual).toBeNull(); // nenhum item estimado
    expect(migracao?.progresso.semEstimativa).toBe(5);
  });

  it('alertas: item impedido e sobrecarga (Diego, 110%)', async () => {
    const container = comDadosDeExemplo();
    const antes = await container.metricas.portfolio();
    expect(antes.projetos[0]?.alertas.itensImpedidos).toBe(0);
    expect(antes.projetos[0]?.alertas.sobrecarga).toEqual([
      expect.objectContaining({ pico: 110, de: '2026-11-02', ate: '2026-12-18' }),
    ]);

    const [primeiro] = await container.backlog.listarPorProjeto(antes.projetos[0]!.id);
    await container.backlog.impedir(primeiro!.id, 'Aguardando API');
    expect((await container.metricas.portfolio()).projetos[0]?.alertas.itensImpedidos).toBe(1);
  });
});

describe('burndown (roteiro de aceite, passos 2 e 3)', () => {
  it('sprint 2 em 09/10: escopo 21 e restante 13; concluir o de 8 pontos leva o restante a 5', async () => {
    const container = comDadosDeExemplo();
    const portfolio = await container.metricas.portfolio();
    const sprintId = portfolio.projetos[0]!.sprintAtual!.id;

    const antes = await container.metricas.burndown(sprintId);
    expect(antes).toMatchObject({ sprintId, escopo: 21, restante: 13 });
    expect(antes.dias).toHaveLength(10);
    expect(antes.dias.find((d) => d.data === '2026-10-06')?.restante).toBe(13);
    expect(antes.dias.find((d) => d.data === '2026-10-05')?.restante).toBe(16);
    expect(antes.dias.at(-1)).toMatchObject({ data: '2026-10-13', restante: null });

    const itens = await container.backlog.listarPorProjeto(portfolio.projetos[0]!.id);
    const oito = itens.find((i) => i.sprintId === sprintId && i.estimativa === 8)!;
    const { definicaoDePronto } = await container.projetos.obter(oito.projetoId);
    await container.backlog.definirCriteriosCumpridos(oito.id, definicaoDePronto);
    await container.backlog.transicionar(oito.id, 'concluido');

    expect(await container.metricas.burndown(sprintId)).toMatchObject({ escopo: 21, restante: 5 });
  });

  it('sprint planejada: só a linha ideal, sem pontos reais; inexistente: 404', async () => {
    const container = comDadosDeExemplo();
    const portfolio = await container.metricas.portfolio();
    const terceira = portfolio.projetos[0]!.sprints[2]!;
    const burndown = await container.metricas.burndown(terceira.id);
    expect(burndown).toMatchObject({ restante: null, escopo: null });
    expect(burndown.dias.length).toBeGreaterThan(0);
    await expect(container.metricas.burndown('nada')).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });

  it('sprint 1 (encerrada) mostra a sprint toda e termina com restante 0', async () => {
    const container = comDadosDeExemplo();
    const portfolio = await container.metricas.portfolio();
    const burndown = await container.metricas.burndown(portfolio.projetos[0]!.sprints[0]!.id);
    expect(burndown.dias.every((d) => d.restante !== null)).toBe(true);
    expect(burndown.dias.at(-1)).toMatchObject({ restante: 0, escopo: 13, ideal: 0 });
  });
});

describe('velocity e progresso (roteiro de aceite, passo 10)', () => {
  it('sprint 1 = 13 e média 13; depois de encerrar a 2 com velocity 16, média 14,5', async () => {
    const container = comDadosDeExemplo();
    const portfolio = await container.metricas.portfolio();
    const projetoId = portfolio.projetos[0]!.id;
    const primeira = portfolio.projetos[0]!.sprints[0]!;
    expect(await container.metricas.velocity(projetoId)).toEqual({
      sprints: [{ sprintId: primeira.id, numero: 1, velocity: 13 }],
      media: 13,
    });

    const sprint2 = portfolio.projetos[0]!.sprints[1]!.id;
    const itens = (await container.backlog.listarPorProjeto(projetoId)).filter(
      (i) => i.sprintId === sprint2,
    );
    const { definicaoDePronto } = await container.projetos.obter(projetoId);
    const resultados = [];
    for (const item of itens) {
      if (item.estado !== 'concluido' && item.estimativa === 8) {
        await container.backlog.definirCriteriosCumpridos(item.id, definicaoDePronto);
        await container.backlog.transicionar(item.id, 'concluido');
      }
    }
    for (const item of await container.backlog.listarPorProjeto(projetoId)) {
      if (item.sprintId !== sprint2) continue;
      resultados.push({
        itemId: item.id,
        resultado: item.estado === 'concluido' ? ('aceito' as const) : ('nao_aceito' as const),
      });
    }
    await container.sprints.registrarReview(sprint2, resultados);
    await container.sprints.encerrar(sprint2);

    const depois = await container.metricas.velocity(projetoId);
    expect(depois.sprints.map((s) => s.velocity)).toEqual([13, 16]);
    expect(depois.media).toBe(14.5);
    // passo 6: progresso 29 ÷ 73 ≈ 40%
    expect(await container.metricas.progresso(projetoId)).toMatchObject({
      pontosConcluidos: 29,
      pontosTotais: 73,
      percentual: 40,
    });
  });

  it('projeto sem sprint encerrada: sem dados; projeto inexistente: 404', async () => {
    const container = comDadosDeExemplo();
    const migracao = (await container.metricas.portfolio()).projetos[1]!;
    expect(await container.metricas.velocity(migracao.id)).toEqual({ sprints: [], media: null });
    await expect(container.metricas.velocity('nada')).rejects.toBeInstanceOf(ErroNaoEncontrado);
    await expect(container.metricas.progresso('nada')).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });
});
