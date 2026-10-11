import type { HistoricoEstado, ItemBacklog } from '../backlog/item-backlog';
import { ErroDeRegra } from '../compartilhado/erro-de-regra';
import type { Instante } from '../compartilhado/tipos';
import { calcularVelocity } from '../metricas/velocity';
import type { Sprint } from './sprint';

export interface ResultadoDoEncerramento {
  sprint: Sprint;
  /** Itens que mudaram: os que voltaram ao backlog e os que só trocaram de posição. */
  itensAlterados: ItemBacklog[];
  historico: HistoricoEstado[];
}

/**
 * Encerra a sprint ativa.
 *
 * - RN-06: velocity = soma da estimativa planejada dos itens aceitos.
 * - RN-05: os itens sem resultado `aceito` voltam ao backlog em `pronto_para_sprint`, sem sprint,
 *   no topo e mantendo a ordem relativa que tinham; os aceitos continuam como estavam.
 * - Item sem resultado registrado conta como `nao_aceito` no registro da sprint.
 *
 * É uma função pura: quem chama grava tudo numa transação (tudo ou nada).
 */
export function encerrarSprint(
  sprint: Sprint,
  itensDoProjeto: readonly ItemBacklog[],
  agora: Instante,
): ResultadoDoEncerramento {
  if (sprint.situacao !== 'ativa') {
    throw new ErroDeRegra('SPRINT-NAO-ATIVA', 'Só uma sprint ativa pode ser encerrada.');
  }

  const itensDaSprint = sprint.itens.map((item) => ({
    ...item,
    resultado: item.resultado ?? ('nao_aceito' as const),
  }));
  const voltam = new Set(
    itensDaSprint.filter((item) => item.resultado !== 'aceito').map((item) => item.itemId),
  );

  const porOrdem = [...itensDoProjeto].sort((a, b) => a.ordem - b.ordem);
  const historico: HistoricoEstado[] = [];
  const devolvidos = porOrdem
    .filter((item) => voltam.has(item.id))
    .map((item): ItemBacklog => {
      if (item.estado !== 'pronto_para_sprint') {
        historico.push({ itemId: item.id, de: item.estado, para: 'pronto_para_sprint', em: agora });
      }
      return { ...item, sprintId: null, estado: 'pronto_para_sprint' };
    });
  const restantes = porOrdem.filter((item) => !voltam.has(item.id));

  const originais = new Map(itensDoProjeto.map((item) => [item.id, item]));
  const itensAlterados = [...devolvidos, ...restantes]
    .map((item, indice): ItemBacklog => ({ ...item, ordem: indice + 1 }))
    .filter((item) => {
      const antes = originais.get(item.id);
      return (
        antes?.ordem !== item.ordem ||
        antes.sprintId !== item.sprintId ||
        antes.estado !== item.estado
      );
    });

  return {
    sprint: {
      ...sprint,
      situacao: 'encerrada',
      itens: itensDaSprint,
      velocity: calcularVelocity(itensDaSprint),
    },
    itensAlterados,
    historico,
  };
}
