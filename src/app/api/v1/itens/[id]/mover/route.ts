import { obterContainer } from '@/infra/container';
import { lerCorpoJson, tratar, validar } from '../../../_lib/http';
import { esquemaMover } from '../../schemas';

export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ id: string }>;
}

/** Responde com a lista do projeto já reordenada, para a tela atualizar de uma vez. */
export const POST = tratar(async (request: Request, { params }: Contexto) => {
  const { id } = await params;
  const { direcao } = validar(esquemaMover, await lerCorpoJson(request));
  return Response.json(await obterContainer().backlog.mover(id, direcao));
});
