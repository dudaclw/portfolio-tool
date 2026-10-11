import { obterContainer } from '@/infra/container';
import { lerCorpoJson, tratar, validar } from '../../_lib/http';
import { esquemaAlteracaoDeItem } from '../schemas';

export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ id: string }>;
}

export const GET = tratar(async (_request: Request, { params }: Contexto) => {
  const { id } = await params;
  return Response.json(await obterContainer().backlog.obter(id));
});

export const PATCH = tratar(async (request: Request, { params }: Contexto) => {
  const { id } = await params;
  const alteracoes = validar(esquemaAlteracaoDeItem, await lerCorpoJson(request));
  return Response.json(await obterContainer().backlog.editar(id, alteracoes));
});

export const DELETE = tratar(async (_request: Request, { params }: Contexto) => {
  const { id } = await params;
  await obterContainer().backlog.remover(id);
  return new Response(null, { status: 204 });
});
