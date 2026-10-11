import { obterContainer } from '@/infra/container';
import { tratar } from '../_lib/http';

export const dynamic = 'force-dynamic';

export const GET = tratar(async () => {
  return Response.json(await obterContainer().metricas.portfolio());
});
