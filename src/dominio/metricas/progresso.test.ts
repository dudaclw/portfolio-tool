import { describe, expect, it } from 'vitest';
import { calcularProgresso } from './progresso';

const item = (estimativa: number | null, estado: 'novo' | 'concluido' | 'em_andamento') => ({
  estimativa,
  estado,
});

describe('RN-11: progresso do projeto', () => {
  it('20 pontos estimados e 8 concluídos → 40%; 2 itens sem estimativa ficam de fora e são contados', () => {
    const progresso = calcularProgresso([
      item(8, 'concluido'),
      item(5, 'novo'),
      item(7, 'em_andamento'),
      item(null, 'novo'),
      item(null, 'concluido'),
    ]);
    expect(progresso).toEqual({
      pontosConcluidos: 8,
      pontosTotais: 20,
      percentual: 40,
      semEstimativa: 2,
    });
  });

  it('dados de exemplo: 21 de 73 pontos ≈ 29%, com 1 item sem estimativa', () => {
    const itens = [
      ...[5, 3, 5, 5, 3].map((p) => item(p, 'concluido')), // sprints 1 e 2 concluídos: 21
      item(8, 'em_andamento'),
      item(5, 'em_andamento'),
      ...[3, 5, 8, 2, 5, 13, 3].map((p) => item(p, 'novo')), // backlog: 39
      item(null, 'novo'),
    ];
    expect(calcularProgresso(itens)).toEqual({
      pontosConcluidos: 21,
      pontosTotais: 73,
      percentual: 29,
      semEstimativa: 1,
    });
  });

  it('sem pontos estimados não há percentual (evita dividir por zero)', () => {
    expect(calcularProgresso([])).toEqual({
      pontosConcluidos: 0,
      pontosTotais: 0,
      percentual: null,
      semEstimativa: 0,
    });
    expect(calcularProgresso([item(null, 'novo')]).percentual).toBeNull();
  });

  it('tudo concluído → 100%; nada concluído → 0%', () => {
    expect(calcularProgresso([item(5, 'concluido')]).percentual).toBe(100);
    expect(calcularProgresso([item(5, 'novo')]).percentual).toBe(0);
  });
});
