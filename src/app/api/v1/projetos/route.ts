import { obterContainer } from '@/infra/container';
import { lerCorpoJson, tratar, validar } from '../_lib/http';
import { esquemaNovoProjeto } from './schemas';

export const dynamic = 'force-dynamic';

export const GET = tratar(async () => {
  return Response.json(await obterContainer().projetos.listar());
});

export const POST = tratar(async (request: Request) => {
  const entrada = validar(esquemaNovoProjeto, await lerCorpoJson(request));
  const projeto = await obterContainer().projetos.criar(entrada);
  return Response.json(projeto, {
    status: 201,
    headers: { Location: `/api/v1/projetos/${projeto.id}` },
  });
});
