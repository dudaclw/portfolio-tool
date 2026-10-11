import { obterContainer } from '@/infra/container';
import { lerCorpoJsonOpcional, tratar, validar } from '../../../_lib/http';
import { esquemaNovaSprint } from '../../../sprints/schemas';

export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ id: string }>;
}

export const GET = tratar(async (_request: Request, { params }: Contexto) => {
  const { id } = await params;
  return Response.json(await obterContainer().sprints.listarPorProjeto(id));
});

/** O corpo é opcional: sem ele, a sprint usa as datas padrão (seção 4). */
export const POST = tratar(async (request: Request, { params }: Contexto) => {
  const { id } = await params;
  const entrada = validar(esquemaNovaSprint, await lerCorpoJsonOpcional(request));
  const sprint = await obterContainer().sprints.criar(id, entrada);
  return Response.json(sprint, {
    status: 201,
    headers: { Location: `/api/v1/sprints/${sprint.id}` },
  });
});
