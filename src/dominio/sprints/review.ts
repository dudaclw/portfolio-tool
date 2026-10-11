import type { ItemBacklog } from '../backlog/item-backlog';
import { ErroDeRegra } from '../compartilhado/erro-de-regra';
import { ErroDeValidacao } from '../compartilhado/erro-de-validacao';
import type { ItemNaSprint, Sprint } from './sprint';

export interface ResultadoDeReview {
  itemId: string;
  /** `null` desfaz o registro e deixa o item sem resultado. */
  resultado: 'aceito' | 'nao_aceito' | null;
  feedback?: string;
}

/**
 * Registra o aceite por item (só com a sprint ativa). Os itens que não aparecem em `resultados`
 * ficam como estavam. Aceitar exige o item concluído: o aceite do Product Owner é sobre trabalho
 * entregue, e é ele que entra na velocity (RN-06).
 */
export function registrarReview(
  sprint: Sprint,
  itensDoProjeto: readonly ItemBacklog[],
  resultados: readonly ResultadoDeReview[],
): Sprint {
  if (sprint.situacao !== 'ativa') {
    throw new ErroDeRegra('SPRINT-NAO-ATIVA', 'O review só é registrado com a sprint ativa.');
  }
  const porId = new Map(itensDoProjeto.map((item) => [item.id, item]));
  const naSprint = new Set(sprint.itens.map((item) => item.itemId));

  if (resultados.some(({ itemId }) => !naSprint.has(itemId))) {
    throw new ErroDeValidacao([
      { campo: 'resultados', mensagem: 'Há itens que não fazem parte desta sprint.' },
    ]);
  }
  for (const { itemId, resultado } of resultados) {
    const item = porId.get(itemId);
    if (resultado === 'aceito' && item?.estado !== 'concluido') {
      throw new ErroDeRegra(
        'ITEM-NAO-CONCLUIDO',
        `O item "${item?.titulo ?? itemId}" ainda não está concluído e não pode ser aceito.`,
      );
    }
  }

  const novos = new Map(resultados.map((r) => [r.itemId, r]));
  const itens = sprint.itens.map((item): ItemNaSprint => {
    const novo = novos.get(item.itemId);
    if (!novo) return item;
    const feedback = novo.feedback?.trim();
    // O resultado novo substitui o anterior por inteiro, inclusive o feedback.
    const atualizado: ItemNaSprint = {
      itemId: item.itemId,
      estimativaPlanejada: item.estimativaPlanejada,
      adicionadoEm: item.adicionadoEm,
      resultado: novo.resultado,
    };
    if (feedback) atualizado.feedbackReview = feedback;
    return atualizado;
  });
  return { ...sprint, itens };
}
