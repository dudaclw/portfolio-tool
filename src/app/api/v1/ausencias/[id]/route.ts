import { obterContainer } from '@/infra/container';
import { tratar } from '../../_lib/http';

export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ id: string }>;
}

export const DELETE = tratar(async (_request: Request, { params }: Contexto) => {
  const { id } = await params;
  await obterContainer().recursos.ausencias.remover(id);
  return new Response(null, { status: 204 });
});
