import { z } from 'zod';
import { ehErroNaoEncontrado } from '@/aplicacao/erros';
import { ehErroDeRegra } from '@/dominio/compartilhado/erro-de-regra';
import {
  ErroDeValidacao,
  ehErroDeValidacao,
  type ProblemaDeCampo,
} from '@/dominio/compartilhado/erro-de-validacao';

// Mensagens de validação do Zod em português do Brasil.
z.config(z.locales.ptBR());

const TIPO_PROBLEMA = 'application/problem+json';

export function problema(
  status: number,
  title: string,
  detail: string,
  extras: Record<string, unknown> = {},
): Response {
  return new Response(JSON.stringify({ type: 'about:blank', title, status, detail, ...extras }), {
    status,
    headers: { 'content-type': TIPO_PROBLEMA },
  });
}

/** Traduz erros conhecidos em respostas: ErroDeRegra → 409, validação → 422, inexistente → 404. */
export function traduzirErro(erro: unknown): Response {
  if (ehErroDeRegra(erro)) {
    return problema(409, 'Regra de negócio violada', erro.mensagem, { codigo: erro.codigo });
  }
  if (ehErroDeValidacao(erro)) {
    return problema(422, 'Dados inválidos', erro.message, { erros: erro.campos });
  }
  if (ehErroNaoEncontrado(erro)) {
    return problema(404, 'Recurso não encontrado', erro.message);
  }
  console.error(erro);
  return problema(500, 'Erro interno', 'Ocorreu um erro inesperado. Tente novamente.');
}

/** Envolve um handler para que qualquer erro vire uma resposta application/problem+json. */
export function tratar<Argumentos extends unknown[]>(
  handler: (...argumentos: Argumentos) => Promise<Response>,
): (...argumentos: Argumentos) => Promise<Response> {
  return async (...argumentos) => {
    try {
      return await handler(...argumentos);
    } catch (erro) {
      return traduzirErro(erro);
    }
  };
}

export async function lerCorpoJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ErroDeValidacao([
      { campo: 'corpo', mensagem: 'O corpo da requisição não é um JSON válido.' },
    ]);
  }
}

/** Valida com Zod; falhas viram ErroDeValidacao (HTTP 422) com a lista de campos. */
export function validar<T>(esquema: z.ZodType<T>, valor: unknown): T {
  const resultado = esquema.safeParse(valor);
  if (resultado.success) return resultado.data;
  const campos: ProblemaDeCampo[] = resultado.error.issues.map((item) => ({
    campo:
      item.code === 'unrecognized_keys' ? item.keys.join(', ') : item.path.join('.') || 'corpo',
    mensagem: item.message,
  }));
  throw new ErroDeValidacao(campos);
}
