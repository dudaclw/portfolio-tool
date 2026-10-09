import type { Data } from '../compartilhado/tipos';

export interface Pessoa {
  id: string;
  nome: string;
  funcao: string;
  jornadaSemanalHoras: number;
}

export interface Alocacao {
  id: string;
  pessoaId: string;
  projetoId: string;
  inicio: Data;
  fim: Data;
  /** De 1 a 100. */
  percentual: number;
}

export interface Ausencia {
  id: string;
  pessoaId: string;
  inicio: Data;
  fim: Data;
}

export interface Feriado {
  data: Data;
  nome: string;
}
