import type { Instante } from '../compartilhado/tipos';

export type EstadoItem =
  'novo' | 'refinado' | 'pronto_para_sprint' | 'em_andamento' | 'em_revisao' | 'concluido';

export type TipoItem = 'historia' | 'tarefa' | 'bug' | 'debito_tecnico';

export interface ItemBacklog {
  id: string;
  projetoId: string;
  tipo: TipoItem;
  titulo: string;
  descricao: string;
  criteriosAceite: string;
  /** 1, 2, 3, 5, 8, 13 ou 21. */
  estimativa: number | null;
  /** Posição inteira no backlog. */
  ordem: number;
  estado: EstadoItem;
  responsavelId: string | null;
  impedido: { motivo: string; desde: Instante } | null;
  /** Itens da Definição de Pronto cumpridos. */
  dodMarcados: string[];
  sprintId: string | null;
}

export interface HistoricoEstado {
  itemId: string;
  de: EstadoItem | null;
  para: EstadoItem;
  em: Instante;
}
