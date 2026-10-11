import { describe, expect, it } from 'vitest';
import { criarItem, type ItemBacklog } from './item-backlog';
import { resumirBacklog } from './resumo';

const item = (parcial: Partial<ItemBacklog>): ItemBacklog => ({
  ...criarItem('i', 'p1', { titulo: 'x' }, 1),
  ...parcial,
});

describe('resumirBacklog', () => {
  it('soma pontos, separa os prontos para sprint e conta os sem estimativa', () => {
    const resumo = resumirBacklog([
      item({ estimativa: 3, estado: 'novo' }),
      item({ estimativa: 5, estado: 'pronto_para_sprint' }),
      item({ estimativa: 8, estado: 'pronto_para_sprint' }),
      item({ estimativa: null, estado: 'refinado' }),
    ]);
    expect(resumo).toEqual({
      itens: 4,
      totalDePontos: 16,
      pontosProntosParaSprint: 13,
      semEstimativa: 1,
    });
  });

  it('ignora itens que já estão em uma sprint', () => {
    expect(resumirBacklog([item({ estimativa: 5, sprintId: 'sp1' })])).toEqual({
      itens: 0,
      totalDePontos: 0,
      pontosProntosParaSprint: 0,
      semEstimativa: 0,
    });
  });
});
