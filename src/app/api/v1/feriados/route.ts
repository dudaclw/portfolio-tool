import { obterContainer } from '@/infra/container';
import { lerCorpoJson, tratar, validar } from '../_lib/http';
import { esquemaNovoFeriado } from '../_lib/schemas-de-recursos';

export const dynamic = 'force-dynamic';

export const GET = tratar(async () => {
  return Response.json(await obterContainer().recursos.feriados.listar());
});

export const POST = tratar(async (request: Request) => {
  const entrada = validar(esquemaNovoFeriado, await lerCorpoJson(request));
  const feriado = await obterContainer().recursos.feriados.criar(entrada);
  return Response.json(feriado, {
    status: 201,
    headers: { Location: `/api/v1/feriados/${feriado.data}` },
  });
});
