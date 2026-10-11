import { z } from 'zod';
import { ehDataValida } from '@/dominio/compartilhado/datas';

const data = z.string().refine(ehDataValida, 'Data inválida. Use o formato AAAA-MM-DD.');

// O Zod cuida só de forma e tipo; limites de valor (jornada > 0, percentual de 1 a 100) ficam no domínio.
export const esquemaNovaPessoa = z.strictObject({
  nome: z.string(),
  funcao: z.string().optional(),
  jornadaSemanalHoras: z.number(),
});

export const esquemaAlteracaoDePessoa = z
  .strictObject({ nome: z.string(), funcao: z.string(), jornadaSemanalHoras: z.number() })
  .partial()
  .refine((a) => Object.keys(a).length > 0, 'Informe ao menos um campo para alterar.');

export const esquemaNovaAlocacao = z.strictObject({
  pessoaId: z.string(),
  projetoId: z.string(),
  inicio: data,
  fim: data,
  percentual: z.number(),
});

export const esquemaNovaAusencia = z.strictObject({
  pessoaId: z.string(),
  inicio: data,
  fim: data,
});

export const esquemaNovoFeriado = z.strictObject({ data: z.string(), nome: z.string() });

export const esquemaFiltroDeAlocacoes = z.strictObject({
  pessoaId: z.string().optional(),
  projetoId: z.string().optional(),
});

export const esquemaFiltroDeAusencias = z.strictObject({ pessoaId: z.string().optional() });

export const esquemaJanelaDeCarga = z.strictObject({
  de: z.string().optional(),
  ate: z.string().optional(),
});

/** Parâmetros de consulta (`?a=1&b=2`) como objeto. */
export function consulta(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams);
}
