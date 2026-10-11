import type { ItemBacklog } from '../backlog/item-backlog';

export interface ProgressoDoProjeto {
  pontosConcluidos: number;
  /** Pontos de todos os itens estimados, em qualquer estado. */
  pontosTotais: number;
  /** Inteiro de 0 a 100; null quando ainda não há pontos estimados. */
  percentual: number | null;
  /** Itens sem estimativa: ficam fora da conta e a tela mostra quantos são. */
  semEstimativa: number;
}

/**
 * RN-11: percentual de conclusão = pontos dos itens concluídos ÷ pontos de todos os itens
 * estimados. Itens sem estimativa ficam de fora da conta e são contados à parte.
 */
export function calcularProgresso(
  itens: readonly Pick<ItemBacklog, 'estimativa' | 'estado'>[],
): ProgressoDoProjeto {
  let pontosConcluidos = 0;
  let pontosTotais = 0;
  let semEstimativa = 0;
  for (const item of itens) {
    if (item.estimativa === null) {
      semEstimativa += 1;
      continue;
    }
    pontosTotais += item.estimativa;
    if (item.estado === 'concluido') pontosConcluidos += item.estimativa;
  }
  return {
    pontosConcluidos,
    pontosTotais,
    percentual: pontosTotais === 0 ? null : Math.round((pontosConcluidos / pontosTotais) * 100),
    semEstimativa,
  };
}
