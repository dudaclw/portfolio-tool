import { somarDias } from '../compartilhado/datas';
import type { Data } from '../compartilhado/tipos';

/** Fim da sprint = início + (duração − 1) dias corridos. */
export function calcularFimDaSprint(inicio: Data, duracaoSprintDias: number): Data {
  return somarDias(inicio, duracaoSprintDias - 1);
}
