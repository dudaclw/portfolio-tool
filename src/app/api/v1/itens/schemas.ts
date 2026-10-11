import { z } from 'zod';
import { ESTADOS_DE_ITEM, TIPOS_DE_ITEM } from '@/dominio/backlog/item-backlog';

// O Zod cuida só de forma e tipo; escala de estimativa e demais regras de valor ficam no domínio.
const campos = {
  tipo: z.enum(TIPOS_DE_ITEM),
  titulo: z.string(),
  descricao: z.string(),
  criteriosAceite: z.string(),
  estimativa: z.number().nullable(),
  responsavelId: z.string().nullable(),
};

export const esquemaNovoItem = z.strictObject({
  tipo: campos.tipo.optional(),
  titulo: campos.titulo,
  descricao: campos.descricao.optional(),
  criteriosAceite: campos.criteriosAceite.optional(),
  estimativa: campos.estimativa.optional(),
  responsavelId: campos.responsavelId.optional(),
});

export const esquemaAlteracaoDeItem = z
  .strictObject(campos)
  .partial()
  .refine(
    (alteracoes) => Object.keys(alteracoes).length > 0,
    'Informe ao menos um campo para alterar.',
  );

export const esquemaMover = z.strictObject({ direcao: z.enum(['acima', 'abaixo']) });

export const esquemaTransicao = z.strictObject({ para: z.enum(ESTADOS_DE_ITEM) });

export const esquemaDefinicaoDePronto = z.strictObject({ marcados: z.array(z.string()) });

export const esquemaImpedimento = z.strictObject({ motivo: z.string() });
