import { obterContainer } from '@/infra/container';
import { tratar } from '../../../_lib/http';

export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ id: string }>;
}

export const POST = tratar(async (_request: Request, { params }: Contexto) => {
  const { id } = await params;
  return Response.json(await obterContainer().sprints.iniciar(id));
});
