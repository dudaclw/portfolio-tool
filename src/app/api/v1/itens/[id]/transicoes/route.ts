import { obterContainer } from '@/infra/container';
import { lerCorpoJson, tratar, validar } from '../../../_lib/http';
import { esquemaTransicao } from '../../schemas';

export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ id: string }>;
}

export const POST = tratar(async (request: Request, { params }: Contexto) => {
  const { id } = await params;
  const { para } = validar(esquemaTransicao, await lerCorpoJson(request));
  return Response.json(await obterContainer().backlog.transicionar(id, para));
});
