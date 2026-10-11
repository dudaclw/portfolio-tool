import { obterContainer } from '@/infra/container';
import { lerCorpoJson, tratar, validar } from '../../../_lib/http';
import { esquemaImpedimento } from '../../schemas';

export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ id: string }>;
}

export const PUT = tratar(async (request: Request, { params }: Contexto) => {
  const { id } = await params;
  const { motivo } = validar(esquemaImpedimento, await lerCorpoJson(request));
  return Response.json(await obterContainer().backlog.impedir(id, motivo));
});

export const DELETE = tratar(async (_request: Request, { params }: Contexto) => {
  const { id } = await params;
  return Response.json(await obterContainer().backlog.liberar(id));
});
