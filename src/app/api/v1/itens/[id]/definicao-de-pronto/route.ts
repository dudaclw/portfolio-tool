import { obterContainer } from '@/infra/container';
import { lerCorpoJson, tratar, validar } from '../../../_lib/http';
import { esquemaDefinicaoDePronto } from '../../schemas';

export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ id: string }>;
}

export const PUT = tratar(async (request: Request, { params }: Contexto) => {
  const { id } = await params;
  const { marcados } = validar(esquemaDefinicaoDePronto, await lerCorpoJson(request));
  return Response.json(await obterContainer().backlog.definirCriteriosCumpridos(id, marcados));
});
