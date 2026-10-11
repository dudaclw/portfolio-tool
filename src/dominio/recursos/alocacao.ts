import { compararDatas, ehDataValida } from '../compartilhado/datas';
import { ErroDeValidacao, type ProblemaDeCampo } from '../compartilhado/erro-de-validacao';
import type { Data } from '../compartilhado/tipos';
import type { Alocacao, Ausencia } from './recursos';

export interface EntradaDeAlocacao {
  pessoaId: string;
  projetoId: string;
  inicio: Data;
  fim: Data;
  /** Inteiro de 1 a 100. */
  percentual: number;
}

export interface EntradaDeAusencia {
  pessoaId: string;
  inicio: Data;
  fim: Data;
}

function validarPeriodo(inicio: Data, fim: Data): ProblemaDeCampo[] {
  const problemas: ProblemaDeCampo[] = [];
  const inicioValido = ehDataValida(inicio);
  const fimValido = ehDataValida(fim);
  if (!inicioValido) {
    problemas.push({ campo: 'inicio', mensagem: 'Data de início inválida. Use AAAA-MM-DD.' });
  }
  if (!fimValido) {
    problemas.push({ campo: 'fim', mensagem: 'Data de fim inválida. Use AAAA-MM-DD.' });
  }
  if (inicioValido && fimValido && compararDatas(fim, inicio) < 0) {
    problemas.push({ campo: 'fim', mensagem: 'O fim não pode ser anterior ao início.' });
  }
  return problemas;
}

/** Percentual de 1 a 100 (inteiro) e período coerente. */
export function criarAlocacao(id: string, entrada: EntradaDeAlocacao): Alocacao {
  const problemas = validarPeriodo(entrada.inicio, entrada.fim);
  if (!Number.isInteger(entrada.percentual) || entrada.percentual < 1 || entrada.percentual > 100) {
    problemas.push({
      campo: 'percentual',
      mensagem: 'O percentual deve ser um número inteiro de 1 a 100.',
    });
  }
  if (problemas.length > 0) throw new ErroDeValidacao(problemas);
  return { id, ...entrada };
}

export function criarAusencia(id: string, entrada: EntradaDeAusencia): Ausencia {
  const problemas = validarPeriodo(entrada.inicio, entrada.fim);
  if (problemas.length > 0) throw new ErroDeValidacao(problemas);
  return { id, ...entrada };
}
