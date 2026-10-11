import { obterContainer } from '@/infra/container';
import {
  consulta,
  esquemaFiltroDeAlocacoes,
  esquemaNovaAlocacao,
} from '../_lib/schemas-de-recursos';
import { lerCorpoJson, tratar, validar } from '../_lib/http';

export const dynamic = 'force-dynamic';

/** Filtros opcionais: `?pessoaId=` e `?projetoId=`. */
export const GET = tratar(async (request: Request) => {
  const filtros = validar(esquemaFiltroDeAlocacoes, consulta(request));
  return Response.json(await obterContainer().recursos.alocacoes.listar(filtros));
});

/** A alocação é gravada mesmo com sobrecarga; os avisos RN-08 vêm ao lado dos dados. */
export const POST = tratar(async (request: Request) => {
  const entrada = validar(esquemaNovaAlocacao, await lerCorpoJson(request));
  const alocacao = await obterContainer().recursos.alocacoes.criar(entrada);
  return Response.json(alocacao, {
    status: 201,
    headers: { Location: `/api/v1/alocacoes/${alocacao.id}` },
  });
});
