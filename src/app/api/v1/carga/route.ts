import { obterContainer } from '@/infra/container';
import { tratar, validar } from '../_lib/http';
import { consulta, esquemaJanelaDeCarga } from '../_lib/schemas-de-recursos';

export const dynamic = 'force-dynamic';

/** `?de=AAAA-MM-DD&ate=AAAA-MM-DD`; sem datas, 12 semanas a partir da semana atual. */
export const GET = tratar(async (request: Request) => {
  const janela = validar(esquemaJanelaDeCarga, consulta(request));
  return Response.json(await obterContainer().recursos.carga(janela));
});
