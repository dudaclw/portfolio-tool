import { z } from 'zod';
import { ehDataValida } from '@/dominio/compartilhado/datas';

const data = z.string().refine(ehDataValida, 'Data inválida. Use o formato AAAA-MM-DD.');

export const esquemaNovaSprint = z.strictObject({ inicio: data.optional() });

export const esquemaPlanejamento = z.strictObject({
  meta: z.string(),
  itemIds: z.array(z.string()),
});

export const esquemaDatasDaSprint = z
  .strictObject({ inicio: data, fim: data })
  .partial()
  .refine((datas) => Object.keys(datas).length > 0, 'Informe ao menos uma data para alterar.');

export const esquemaReview = z.strictObject({
  resultados: z.array(
    z.strictObject({
      itemId: z.string(),
      resultado: z.enum(['aceito', 'nao_aceito']).nullable(),
      feedback: z.string().optional(),
    }),
  ),
});

export const esquemaRetrospectiva = z.strictObject({
  bem: z.array(z.string()),
  melhorar: z.array(z.string()),
  acoes: z.array(
    z.strictObject({
      id: z.string().optional(),
      descricao: z.string(),
      responsavelId: z.string().nullable().optional(),
      prazo: data.nullable().optional(),
      concluida: z.boolean().optional(),
    }),
  ),
});
