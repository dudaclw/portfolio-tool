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
