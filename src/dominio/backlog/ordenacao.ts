import type { ItemBacklog } from './item-backlog';

export type DirecaoDeMovimento = 'acima' | 'abaixo';

export function ordenarPorOrdem(itens: readonly ItemBacklog[]): ItemBacklog[] {
  return [...itens].sort((a, b) => a.ordem - b.ordem);
}

/** Posição de um item novo: depois de todos os do projeto (as posições vão de 1 a N). */
export function proximaOrdem(itens: readonly ItemBacklog[]): number {
  return itens.reduce((maior, item) => Math.max(maior, item.ordem), 0) + 1;
}

/**
 * Sobe ou desce um item trocando de posição com o vizinho imediato do mesmo grupo (fora de
 * sprint, ou na mesma sprint). Como só troca valores de `ordem`, as posições do projeto
 * continuam de 1 a N, sem lacunas nem repetição. Devolve só os itens alterados: dois, ou
 * nenhum se o item já está na ponta.
 */
export function moverItem(
  itens: readonly ItemBacklog[],
  itemId: string,
  direcao: DirecaoDeMovimento,
): ItemBacklog[] {
  const ordenados = ordenarPorOrdem(itens);
  const atual = ordenados.find((item) => item.id === itemId);
  if (!atual) throw new Error(`Item ${itemId} não está na lista.`);

  const grupo = ordenados.filter((item) => item.sprintId === atual.sprintId);
  const posicao = grupo.indexOf(atual);
  const vizinho = grupo[direcao === 'acima' ? posicao - 1 : posicao + 1];
  if (!vizinho) return [];

  return [
    { ...atual, ordem: vizinho.ordem },
    { ...vizinho, ordem: atual.ordem },
  ];
}

/** Renumera de 1 a N mantendo a ordem relativa (depois de remover um item). Devolve só os que mudaram. */
export function compactarOrdem(itens: readonly ItemBacklog[]): ItemBacklog[] {
  const alterados: ItemBacklog[] = [];
  ordenarPorOrdem(itens).forEach((item, indice) => {
    if (item.ordem !== indice + 1) alterados.push({ ...item, ordem: indice + 1 });
  });
  return alterados;
}
