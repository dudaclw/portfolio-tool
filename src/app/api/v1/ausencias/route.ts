import { obterContainer } from '@/infra/container';
import { lerCorpoJson, tratar, validar } from '../_lib/http';
import {
  consulta,
  esquemaFiltroDeAusencias,
  esquemaNovaAusencia,
} from '../_lib/schemas-de-recursos';

export const dynamic = 'force-dynamic';

export const GET = tratar(async (request: Request) => {
  const filtros = validar(esquemaFiltroDeAusencias, consulta(request));
  return Response.json(await obterContainer().recursos.ausencias.listar(filtros));
});

export const POST = tratar(async (request: Request) => {
  const entrada = validar(esquemaNovaAusencia, await lerCorpoJson(request));
  const ausencia = await obterContainer().recursos.ausencias.criar(entrada);
  return Response.json(ausencia, {
    status: 201,
    headers: { Location: `/api/v1/ausencias/${ausencia.id}` },
  });
});
