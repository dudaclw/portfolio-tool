import { obterContainer } from '@/infra/container';
import { tratar } from '../../_lib/http';

export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ data: string }>;
}

export const DELETE = tratar(async (_request: Request, { params }: Contexto) => {
  const { data } = await params;
  await obterContainer().recursos.feriados.remover(data);
  return new Response(null, { status: 204 });
});
