import { obterContainer } from '@/infra/container';
import { lerCorpoJson, tratar, validar } from '../../_lib/http';
import { esquemaAlteracaoDeProjeto } from '../schemas';

export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ id: string }>;
}

export const GET = tratar(async (_request: Request, { params }: Contexto) => {
  const { id } = await params;
  return Response.json(await obterContainer().projetos.obter(id));
});

export const PATCH = tratar(async (request: Request, { params }: Contexto) => {
  const { id } = await params;
  const alteracoes = validar(esquemaAlteracaoDeProjeto, await lerCorpoJson(request));
  return Response.json(await obterContainer().projetos.editar(id, alteracoes));
});
