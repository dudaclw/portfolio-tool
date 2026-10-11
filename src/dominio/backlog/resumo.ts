import type { ItemBacklog } from './item-backlog';

export interface ResumoDoBacklog {
  /** Itens fora de sprint. */
  itens: number;
  totalDePontos: number;
  /** Pontos dos itens em `pronto_para_sprint`. */
  pontosProntosParaSprint: number;
  semEstimativa: number;
}

/** Totais do backlog propriamente dito: só os itens que ainda não estão em uma sprint. */
export function resumirBacklog(itens: readonly ItemBacklog[]): ResumoDoBacklog {
  const resumo: ResumoDoBacklog = {
    itens: 0,
    totalDePontos: 0,
    pontosProntosParaSprint: 0,
    semEstimativa: 0,
  };
  for (const item of itens) {
    if (item.sprintId !== null) continue;
    resumo.itens += 1;
    if (item.estimativa === null) {
      resumo.semEstimativa += 1;
      continue;
    }
    resumo.totalDePontos += item.estimativa;
    if (item.estado === 'pronto_para_sprint') resumo.pontosProntosParaSprint += item.estimativa;
  }
  return resumo;
}
