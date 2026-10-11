import { obterContainer } from '@/infra/container';
import { lerCorpoJson, tratar, validar } from '../../../_lib/http';
import { esquemaDatasDaSprint } from '../../schemas';

export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ id: string }>;
}

/** RN-01: só enquanto a sprint está planejada; depois de iniciada, 409. */
export const PUT = tratar(async (request: Request, { params }: Contexto) => {
  const { id } = await params;
  const datas = validar(esquemaDatasDaSprint, await lerCorpoJson(request));
  return Response.json(await obterContainer().sprints.alterarDatas(id, datas));
});
