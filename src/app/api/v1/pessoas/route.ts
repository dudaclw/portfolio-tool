import { obterContainer } from '@/infra/container';
import { lerCorpoJson, tratar, validar } from '../_lib/http';
import { esquemaNovaPessoa } from '../_lib/schemas-de-recursos';

export const dynamic = 'force-dynamic';

export const GET = tratar(async () => {
  return Response.json(await obterContainer().recursos.pessoas.listar());
});

export const POST = tratar(async (request: Request) => {
  const entrada = validar(esquemaNovaPessoa, await lerCorpoJson(request));
  const pessoa = await obterContainer().recursos.pessoas.criar(entrada);
  return Response.json(pessoa, {
    status: 201,
    headers: { Location: `/api/v1/pessoas/${pessoa.id}` },
  });
});
