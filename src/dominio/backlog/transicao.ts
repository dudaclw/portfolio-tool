import { ErroDeRegra } from '../compartilhado/erro-de-regra';
import { ErroDeValidacao } from '../compartilhado/erro-de-validacao';
import type { Instante } from '../compartilhado/tipos';
import {
  ESTADOS_DE_ITEM,
  type EstadoItem,
  type HistoricoEstado,
  type ItemBacklog,
} from './item-backlog';

export interface ResultadoDaTransicao {
  item: ItemBacklog;
  registro: HistoricoEstado;
}

/** Critérios da Definição de Pronto do projeto que o item ainda não cumpre. */
export function criteriosPendentes(
  item: ItemBacklog,
  definicaoDePronto: readonly string[],
): string[] {
  return definicaoDePronto.filter((criterio) => !item.dodMarcados.includes(criterio));
}

/**
 * Muda o item de estado e devolve também o registro de histórico.
 * RN-04: só vai a `concluido` com todos os critérios da Definição de Pronto marcados.
 * Qualquer outra troca de estado é aceita (a seção 4 não restringe o caminho).
 */
export function transicionarItem(
  item: ItemBacklog,
  para: EstadoItem,
  definicaoDePronto: readonly string[],
  agora: Instante,
): ResultadoDaTransicao {
  if (!ESTADOS_DE_ITEM.includes(para)) {
    throw new ErroDeValidacao([{ campo: 'para', mensagem: 'Estado inválido.' }]);
  }
  if (para === item.estado) {
    throw new ErroDeValidacao([{ campo: 'para', mensagem: 'O item já está nesse estado.' }]);
  }
  if (para === 'concluido') {
    const pendentes = criteriosPendentes(item, definicaoDePronto);
    if (pendentes.length > 0) {
      throw new ErroDeRegra(
        'RN-04',
        `O item só pode ir para Concluído com todos os critérios da Definição de Pronto marcados. Faltam: ${pendentes.join('; ')}.`,
      );
    }
  }
  return {
    item: { ...item, estado: para },
    registro: { itemId: item.id, de: item.estado, para, em: agora },
  };
}
