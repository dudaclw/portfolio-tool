import { obterContainer } from '@/infra/container';
import { tratar } from '../../../_lib/http';

export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ id: string }>;
}

/** Velocity por sprint encerrada e a média das 3 últimas. É do projeto, nunca da pessoa (RN-09). */
export const GET = tratar(async (_request: Request, { params }: Contexto) => {
  const { id } = await params;
  return Response.json(await obterContainer().metricas.velocity(id));
});
