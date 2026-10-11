import { obterContainer } from '@/infra/container';
import { lerCorpoJson, tratar, validar } from '../../../_lib/http';
import { esquemaNovoItem } from '../../../itens/schemas';

export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ id: string }>;
}

export const GET = tratar(async (_request: Request, { params }: Contexto) => {
  const { id } = await params;
  return Response.json(await obterContainer().backlog.listarPorProjeto(id));
});

export const POST = tratar(async (request: Request, { params }: Contexto) => {
  const { id } = await params;
  const entrada = validar(esquemaNovoItem, await lerCorpoJson(request));
  const item = await obterContainer().backlog.criar(id, entrada);
  return Response.json(item, {
    status: 201,
    headers: { Location: `/api/v1/itens/${item.id}` },
  });
});
