import { z } from 'zod';
import { ehDataValida } from '@/dominio/compartilhado/datas';
import { STATUS_DO_PROJETO } from '@/dominio/projetos/projeto';

const data = z.string().refine(ehDataValida, 'Data inválida. Use o formato AAAA-MM-DD.');

const campos = {
  nome: z.string().trim().min(1, 'Informe o nome do projeto.'),
  objetivo: z.string(),
  patrocinador: z.string(),
  inicio: data,
  fimPrevisto: data,
  status: z.enum(STATUS_DO_PROJETO),
  duracaoSprintDias: z.number().int().min(1, 'A duração da sprint deve ser de 1 dia ou mais.'),
  definicaoDePronto: z.array(z.string()),
};

export const esquemaNovoProjeto = z.strictObject({
  nome: campos.nome,
  objetivo: campos.objetivo.optional(),
  patrocinador: campos.patrocinador.optional(),
  inicio: campos.inicio,
  fimPrevisto: campos.fimPrevisto,
  status: campos.status.optional(),
  duracaoSprintDias: campos.duracaoSprintDias.optional(),
  definicaoDePronto: campos.definicaoDePronto.optional(),
});

export const esquemaAlteracaoDeProjeto = z
  .strictObject({
    nome: campos.nome,
    objetivo: campos.objetivo,
    patrocinador: campos.patrocinador,
    inicio: campos.inicio,
    fimPrevisto: campos.fimPrevisto,
    status: campos.status,
    duracaoSprintDias: campos.duracaoSprintDias,
    definicaoDePronto: campos.definicaoDePronto,
  })
  .partial()
  .refine(
    (alteracoes) => Object.keys(alteracoes).length > 0,
    'Informe ao menos um campo para alterar.',
  );
