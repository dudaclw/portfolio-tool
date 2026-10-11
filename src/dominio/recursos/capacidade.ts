import { compararDatas, diasUteis } from '../compartilhado/datas';
import type { Data } from '../compartilhado/tipos';
import type { Alocacao, Ausencia, Pessoa } from './recursos';

export interface CapacidadeDaPessoa {
  pessoaId: string;
  nome: string;
  /** Dias úteis da sprint em que a pessoa não está ausente. */
  diasUteis: number;
  horas: number;
}

export interface CapacidadeDaSprint {
  horasTotais: number;
  pessoas: CapacidadeDaPessoa[];
}

const cobre = (periodo: { inicio: Data; fim: Data }, dia: Data) =>
  compararDatas(periodo.inicio, dia) <= 0 && compararDatas(dia, periodo.fim) <= 0;

const seSobrepoe = (a: { inicio: Data; fim: Data }, b: { inicio: Data; fim: Data }) =>
  compararDatas(a.inicio, b.fim) <= 0 && compararDatas(b.inicio, a.fim) <= 0;

const arredondar = (horas: number) => Math.round(horas * 100) / 100;

export interface EntradaDeCapacidade {
  inicio: Data;
  fim: Data;
  projetoId: string;
  pessoas: readonly Pessoa[];
  alocacoes: readonly Alocacao[];
  ausencias: readonly Ausencia[];
  feriados: Iterable<Data>;
}

/**
 * RN-07: capacidade em horas = soma, por pessoa e por dia útil não ausente da sprint, de
 * (jornada semanal ÷ 5) × (percentual ÷ 100), com o percentual da alocação da pessoa neste
 * projeto naquele dia. Entram as pessoas com alocação no projeto durante a sprint.
 *
 * A conta usa inteiros (jornada × percentual) e divide uma vez no fim (por 500), para não
 * acumular erro de ponto flutuante: 11 dias × 30 h × 60% = 39,6 h exatos.
 */
export function capacidadeDaSprint(entrada: EntradaDeCapacidade): CapacidadeDaSprint {
  const periodo = { inicio: entrada.inicio, fim: entrada.fim };
  const uteis = diasUteis(entrada.inicio, entrada.fim, entrada.feriados);

  const pessoas = [...entrada.pessoas]
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .flatMap((pessoa): CapacidadeDaPessoa[] => {
      const alocacoes = entrada.alocacoes.filter(
        (a) =>
          a.pessoaId === pessoa.id && a.projetoId === entrada.projetoId && seSobrepoe(a, periodo),
      );
      if (alocacoes.length === 0) return [];
      const ausencias = entrada.ausencias.filter((a) => a.pessoaId === pessoa.id);

      const dias = uteis.filter((dia) => !ausencias.some((ausencia) => cobre(ausencia, dia)));
      let jornadaVezesPercentual = 0;
      for (const dia of dias) {
        const percentual = alocacoes
          .filter((alocacao) => cobre(alocacao, dia))
          .reduce((soma, alocacao) => soma + alocacao.percentual, 0);
        jornadaVezesPercentual += pessoa.jornadaSemanalHoras * percentual;
      }
      return [
        {
          pessoaId: pessoa.id,
          nome: pessoa.nome,
          diasUteis: dias.length,
          horas: arredondar(jornadaVezesPercentual / 500),
        },
      ];
    });

  return {
    horasTotais: arredondar(pessoas.reduce((soma, pessoa) => soma + pessoa.horas, 0)),
    pessoas,
  };
}
