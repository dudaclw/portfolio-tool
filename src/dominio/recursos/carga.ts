import {
  compararDatas,
  formatarDataBrasileira,
  intervalo,
  segundaDaSemana,
  somarDias,
} from '../compartilhado/datas';
import type { Data } from '../compartilhado/tipos';
import type { Alocacao, Pessoa } from './recursos';

export interface AvisoDeSobrecarga {
  codigo: 'RN-08';
  mensagem: string;
  pessoaId: string;
  /** Maior soma de percentuais no trecho. */
  pico: number;
  de: Data;
  ate: Data;
}

export interface CargaDaSemana {
  /** Segunda-feira da semana. */
  inicio: Data;
  /** Maior soma de percentuais de um dia da semana (0 se a pessoa não tem alocação). */
  pico: number;
}

export interface CargaDaPessoa {
  pessoaId: string;
  nome: string;
  semanas: CargaDaSemana[];
}

export interface MapaDeCarga {
  semanas: Data[];
  pessoas: CargaDaPessoa[];
}

const LIMITE = 100;

/** Soma dos percentuais de todas as alocações da pessoa em cada dia de `de` a `ate`. */
function cargaPorDia(alocacoes: readonly Alocacao[], de: Data, ate: Data): Map<Data, number> {
  const porDia = new Map<Data, number>();
  for (const alocacao of alocacoes) {
    const inicio = compararDatas(alocacao.inicio, de) < 0 ? de : alocacao.inicio;
    const fim = compararDatas(alocacao.fim, ate) > 0 ? ate : alocacao.fim;
    if (compararDatas(inicio, fim) > 0) continue;
    for (const dia of intervalo(inicio, fim)) {
      porDia.set(dia, (porDia.get(dia) ?? 0) + alocacao.percentual);
    }
  }
  return porDia;
}

/**
 * RN-08: trechos contínuos em que a soma dos percentuais da pessoa passa de 100, dentro de
 * `de` a `ate`. Não bloqueia nada: só alimenta os avisos.
 */
export function avisosDeSobrecarga(
  pessoa: Pessoa,
  alocacoesDaPessoa: readonly Alocacao[],
  de: Data,
  ate: Data,
): AvisoDeSobrecarga[] {
  const porDia = cargaPorDia(alocacoesDaPessoa, de, ate);
  const avisos: AvisoDeSobrecarga[] = [];
  type Trecho = { inicio: Data; fim: Data; pico: number };
  let trecho = null as Trecho | null;

  const fechar = () => {
    if (!trecho) return;
    avisos.push({
      codigo: 'RN-08',
      pessoaId: pessoa.id,
      pico: trecho.pico,
      de: trecho.inicio,
      ate: trecho.fim,
      mensagem: `${pessoa.nome} está com ${trecho.pico}% de alocação (acima de 100%) de ${formatarDataBrasileira(trecho.inicio)} a ${formatarDataBrasileira(trecho.fim)}.`,
    });
    trecho = null;
  };

  for (const dia of intervalo(de, ate)) {
    const total = porDia.get(dia) ?? 0;
    if (total > LIMITE) {
      trecho = trecho
        ? { ...trecho, fim: dia, pico: Math.max(trecho.pico, total) }
        : { inicio: dia, fim: dia, pico: total };
    } else {
      fechar();
    }
  }
  fechar();
  return avisos;
}

/** Mapa pessoa × semana (segunda a domingo) com o pico de alocação, de `de` a `ate`. */
export function mapaDeCarga(
  pessoas: readonly Pessoa[],
  alocacoes: readonly Alocacao[],
  de: Data,
  ate: Data,
): MapaDeCarga {
  const semanas: Data[] = [];
  for (
    let semana = segundaDaSemana(de);
    compararDatas(semana, ate) <= 0;
    semana = somarDias(semana, 7)
  ) {
    semanas.push(semana);
  }
  const primeiroDia = semanas[0] ?? de;
  const ultimoDia = somarDias(semanas.at(-1) ?? ate, 6);

  return {
    semanas,
    pessoas: [...pessoas]
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((pessoa) => {
        const porDia = cargaPorDia(
          alocacoes.filter((a) => a.pessoaId === pessoa.id),
          primeiroDia,
          ultimoDia,
        );
        return {
          pessoaId: pessoa.id,
          nome: pessoa.nome,
          semanas: semanas.map((inicio) => ({
            inicio,
            pico: Math.max(
              0,
              ...intervalo(inicio, somarDias(inicio, 6)).map((d) => porDia.get(d) ?? 0),
            ),
          })),
        };
      }),
  };
}
