import type { Data, Instante } from '../compartilhado/tipos';

export interface ItemNaSprint {
  itemId: string;
  estimativaPlanejada: number;
  adicionadoEm: Instante;
  resultado: 'aceito' | 'nao_aceito' | null;
  feedbackReview?: string;
}

export interface AcaoRetro {
  id: string;
  descricao: string;
  responsavelId?: string;
  prazo?: Data;
  concluida: boolean;
}

export interface Sprint {
  id: string;
  projetoId: string;
  numero: number;
  inicio: Data;
  fim: Data;
  meta: string;
  situacao: 'planejada' | 'ativa' | 'encerrada';
  itens: ItemNaSprint[];
  velocity: number | null;
  retrospectiva?: { bem: string[]; melhorar: string[]; acoes: AcaoRetro[] };
}
