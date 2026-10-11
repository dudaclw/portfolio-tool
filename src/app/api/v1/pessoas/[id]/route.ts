import { obterContainer } from '@/infra/container';
import { lerCorpoJson, tratar, validar } from '../../_lib/http';
import { esquemaAlteracaoDePessoa } from '../../_lib/schemas-de-recursos';

export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ id: string }>;
}

export const PATCH = tratar(async (request: Request, { params }: Contexto) => {
  const { id } = await params;
  const alteracoes = validar(esquemaAlteracaoDePessoa, await lerCorpoJson(request));
  return Response.json(await obterContainer().recursos.pessoas.editar(id, alteracoes));
});

/** Leva junto as alocações e ausências da pessoa e a tira de itens e ações de retrospectiva. */
export const DELETE = tratar(async (_request: Request, { params }: Contexto) => {
  const { id } = await params;
  await obterContainer().recursos.pessoas.remover(id);
  return new Response(null, { status: 204 });
});
