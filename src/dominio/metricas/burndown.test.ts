import { describe, expect, it } from 'vitest';
import type { HistoricoEstado } from '../backlog/item-backlog';
import type { ItemNaSprint } from '../sprints/sprint';
import { calcularBurndown } from './burndown';

// Sprint de segunda 05/10/2026 em diante. Sem feriados, os dias úteis 1 a 6 são
// 05, 06, 07, 08, 09 e 12/10.
const DIAS = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12'];

const naSprint = (itemId: string, estimativaPlanejada: number, dia: string): ItemNaSprint => ({
  itemId,
  estimativaPlanejada,
  adicionadoEm: `${dia}T09:00:00Z`,
  resultado: null,
});
const concluiu = (itemId: string, dia: string): HistoricoEstado => ({
  itemId,
  de: 'em_revisao',
  para: 'concluido',
  em: `${dia}T15:00:00Z`,
});
const sprint = (itens: ItemNaSprint[], parcial = {}) => ({
  inicio: '2026-10-05',
  fim: '2026-10-16',
  situacao: 'ativa' as const,
  itens,
  ...parcial,
});
const restantes = (pontos: ReturnType<typeof calcularBurndown>) =>
  pontos.slice(0, 6).map((p) => p.restante);

describe('calcularBurndown: exemplo da seção 4', () => {
  const itens = [
    naSprint('a', 5, DIAS[0]!),
    naSprint('b', 3, DIAS[0]!),
    naSprint('c', 8, DIAS[0]!),
  ];
  const historico = [concluiu('a', DIAS[2]!), concluiu('b', DIAS[5]!)];

  it('itens de 5, 3 e 8 pontos; o de 5 conclui no dia 3 e o de 3 no dia 6 → 16, 16, 11, 11, 11, 8', () => {
    const pontos = calcularBurndown({
      sprint: sprint(itens),
      historico,
      feriados: [],
      hoje: DIAS[5]!,
    });
    expect(restantes(pontos)).toEqual([16, 16, 11, 11, 11, 8]);
    expect(pontos.slice(0, 6).map((p) => p.escopo)).toEqual([16, 16, 16, 16, 16, 16]);
  });

  it('item de 2 pontos que entra no dia 4: escopo vai a 18 e o restante do dia 4 vira 13', () => {
    const comExtra = [...itens, naSprint('d', 2, DIAS[3]!)];
    const pontos = calcularBurndown({
      sprint: sprint(comExtra),
      historico,
      feriados: [],
      hoje: DIAS[5]!,
    });
    expect(pontos.slice(0, 6).map((p) => p.escopo)).toEqual([16, 16, 16, 18, 18, 18]);
    expect(pontos[3]?.restante).toBe(13);
    expect(restantes(pontos)).toEqual([16, 16, 11, 13, 13, 10]);
  });
});

describe('calcularBurndown: linha ideal e limites', () => {
  const itens = [naSprint('a', 10, '2026-10-05')];

  it('a linha ideal desce linearmente do escopo inicial até 0 no último dia útil', () => {
    // 10 dias úteis (05 a 16/10): 10 → 0 em 9 passos
    const pontos = calcularBurndown({
      sprint: sprint(itens),
      historico: [],
      feriados: [],
      hoje: '2026-10-05',
    });
    expect(pontos).toHaveLength(10);
    expect(pontos[0]?.ideal).toBe(10);
    expect(pontos[9]?.ideal).toBe(0);
    expect(pontos[3]?.ideal).toBeCloseTo(6.67, 2);
  });

  it('o ideal parte do escopo do primeiro dia, mesmo que entrem itens depois', () => {
    const comTardio = [...itens, naSprint('b', 20, '2026-10-08')];
    const pontos = calcularBurndown({
      sprint: sprint(comTardio),
      historico: [],
      feriados: [],
      hoje: '2026-10-16',
    });
    expect(pontos[0]?.ideal).toBe(10);
  });

  it('dias depois de hoje têm só o ideal; antes do início não há ponto real', () => {
    const pontos = calcularBurndown({
      sprint: sprint(itens),
      historico: [],
      feriados: [],
      hoje: '2026-10-07',
    });
    expect(pontos.filter((p) => p.restante !== null)).toHaveLength(3);
    expect(pontos[3]).toMatchObject({ escopo: null, restante: null });
    // sprint ainda planejada: nenhum ponto real, só a linha ideal
    const planejada = calcularBurndown({
      sprint: sprint(itens, { situacao: 'planejada' }),
      historico: [],
      feriados: [],
      hoje: '2026-10-07',
    });
    expect(planejada.every((p) => p.restante === null && p.escopo === null)).toBe(true);
    expect(planejada[0]?.ideal).toBe(10);
  });

  it('sprint iniciada antes da data de início já mostra o primeiro dia, no escopo planejado', () => {
    const pontos = calcularBurndown({
      sprint: sprint(itens),
      historico: [],
      feriados: [],
      hoje: '2026-09-01',
    });
    expect(pontos[0]).toMatchObject({ data: '2026-10-05', escopo: 10, restante: 10, ideal: 10 });
    expect(pontos.slice(1).every((p) => p.restante === null)).toBe(true);
  });

  it('hoje em fim de semana: o último ponto real é a sexta', () => {
    const pontos = calcularBurndown({
      sprint: sprint(itens),
      historico: [],
      feriados: [],
      hoje: '2026-10-10',
    });
    expect(
      pontos
        .filter((p) => p.restante !== null)
        .map((p) => p.data)
        .at(-1),
    ).toBe('2026-10-09');
  });

  it('sprint encerrada mostra todos os dias úteis, mesmo que hoje esteja além do fim', () => {
    const pontos = calcularBurndown({
      sprint: sprint(itens, { situacao: 'encerrada' }),
      historico: [],
      feriados: [],
      hoje: '2026-10-05',
    });
    expect(pontos.every((p) => p.restante === 10)).toBe(true);
  });

  it('fins de semana e feriados não geram ponto', () => {
    const pontos = calcularBurndown({
      sprint: sprint(itens),
      historico: [],
      feriados: ['2026-10-12'],
      hoje: '2026-10-16',
    });
    expect(pontos.map((p) => p.data)).not.toContain('2026-10-10');
    expect(pontos.map((p) => p.data)).not.toContain('2026-10-12');
    expect(pontos).toHaveLength(9);
  });
});

describe('calcularBurndown: reconstrução do estado', () => {
  const itens = [naSprint('a', 5, '2026-10-05')];

  it('concluído e reaberto depois volta a contar como restante', () => {
    const historico: HistoricoEstado[] = [
      concluiu('a', '2026-10-06'),
      { itemId: 'a', de: 'concluido', para: 'em_andamento', em: '2026-10-08T10:00:00Z' },
    ];
    const pontos = calcularBurndown({
      sprint: sprint(itens),
      historico,
      feriados: [],
      hoje: '2026-10-09',
    });
    expect(restantes(pontos).slice(0, 5)).toEqual([5, 0, 0, 5, 5]);
  });

  it('o estado vale ao fim do dia: vários registros no mesmo dia, vale o último', () => {
    const historico: HistoricoEstado[] = [
      { itemId: 'a', de: 'em_andamento', para: 'concluido', em: '2026-10-06T09:00:00Z' },
      { itemId: 'a', de: 'concluido', para: 'em_andamento', em: '2026-10-06T17:00:00Z' },
    ];
    const pontos = calcularBurndown({
      sprint: sprint(itens),
      historico,
      feriados: [],
      hoje: '2026-10-07',
    });
    expect(pontos[1]?.restante).toBe(5);
  });

  it('o histórico de itens de fora da sprint não interfere', () => {
    const pontos = calcularBurndown({
      sprint: sprint(itens),
      historico: [concluiu('outro', '2026-10-05')],
      feriados: [],
      hoje: '2026-10-06',
    });
    expect(restantes(pontos).slice(0, 2)).toEqual([5, 5]);
  });

  it('estimativa planejada, não a atual, é o que conta', () => {
    const pontos = calcularBurndown({
      sprint: sprint([naSprint('a', 5, '2026-10-05')]),
      historico: [],
      feriados: [],
      hoje: '2026-10-05',
    });
    expect(pontos[0]?.escopo).toBe(5);
  });
});

describe('dados de exemplo: sprint 2 em 09/10/2026', () => {
  it('escopo 21 e restante 13 (5 e 3 concluídos em 01/10 e 06/10)', () => {
    const itens = [
      naSprint('a', 5, '2026-09-29'),
      naSprint('b', 3, '2026-09-29'),
      naSprint('c', 8, '2026-09-29'),
      naSprint('d', 5, '2026-09-29'),
    ];
    const pontos = calcularBurndown({
      sprint: { inicio: '2026-09-29', fim: '2026-10-13', situacao: 'ativa', itens },
      historico: [concluiu('a', '2026-10-01'), concluiu('b', '2026-10-06')],
      feriados: ['2026-10-12'],
      hoje: '2026-10-09',
    });
    const hojeNoGrafico = pontos.find((p) => p.data === '2026-10-09');
    expect(hojeNoGrafico).toMatchObject({ escopo: 21, restante: 13 });
    // 10 dias úteis (29/09 a 13/10 sem 12/10); depois de hoje só o ideal
    expect(pontos).toHaveLength(10);
    expect(pontos.at(-1)).toMatchObject({ data: '2026-10-13', restante: null, ideal: 0 });
  });
});
