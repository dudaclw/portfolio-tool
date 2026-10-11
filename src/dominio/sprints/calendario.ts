import { compararDatas, diasUteis, somarDias } from '../compartilhado/datas';
import type { Data } from '../compartilhado/tipos';

/** Fim da sprint = início + (duração − 1) dias corridos. */
export function calcularFimDaSprint(inicio: Data, duracaoSprintDias: number): Data {
  return somarDias(inicio, duracaoSprintDias - 1);
}

/**
 * Início padrão de uma sprint nova: o dia seguinte ao fim da anterior ou, se for a primeira, o
 * início do projeto.
 */
export function inicioPadraoDaSprint(inicioDoProjeto: Data, fimDaAnterior: Data | null): Data {
  return fimDaAnterior === null ? inicioDoProjeto : somarDias(fimDaAnterior, 1);
}

/**
 * Dias úteis que faltam na sprint, contando hoje quando é útil. Antes do início conta desde o
 * início; depois do fim, zero.
 */
export function diasUteisRestantes(
  sprint: { inicio: Data; fim: Data },
  hoje: Data,
  feriados: Iterable<Data> = [],
): number {
  const de = compararDatas(hoje, sprint.inicio) < 0 ? sprint.inicio : hoje;
  if (compararDatas(de, sprint.fim) > 0) return 0;
  return diasUteis(de, sprint.fim, feriados).length;
}
