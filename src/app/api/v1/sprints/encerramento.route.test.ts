import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarContainer, definirContainer, type Container } from '@/infra/container';
import { PUT as PUT_DOD } from '../itens/[id]/definicao-de-pronto/route';
import { POST as POST_TRANSICAO } from '../itens/[id]/transicoes/route';
import { POST as POST_ITEM } from '../projetos/[id]/itens/route';
import { POST as POST_SPRINT } from '../projetos/[id]/sprints/route';
import { POST as POST_ENCERRAR } from './[id]/encerrar/route';
import { POST as POST_INICIAR } from './[id]/iniciar/route';
import { PUT as PUT_PLANEJAMENTO } from './[id]/planejamento/route';
import { PUT as PUT_RETRO } from './[id]/retrospectiva/route';
import { GET } from './[id]/route';
import { PUT as PUT_REVIEW } from './[id]/review/route';

let container: Container;

beforeEach(async () => {
  let n = 0;
  container = criarContainer({
    armazenamento: { tipo: 'memoria' },
    relogio: () => '2026-10-09T12:00:00Z',
    gerarId: () => `id${++n}`,
  });
  definirContainer(container);
  await container.projetos.criar({
    nome: 'Portal',
    inicio: '2026-09-14',
    fimPrevisto: '2026-12-18',
  });
});

afterEach(() => definirContainer(undefined));

const PROJETO = 'id1';
const json = (corpo: unknown, metodo = 'POST') =>
  new Request('http://127.0.0.1:3000/api/v1/x', {
    method: metodo,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  });
const vazio = (metodo = 'GET') => new Request('http://127.0.0.1:3000/api/v1/x', { method: metodo });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

/** Sprint ativa com dois itens (5 e 3 pontos). */
async function sprintAtiva() {
  const ids: string[] = [];
  for (const [titulo, estimativa] of [
    ['A', 5],
    ['B', 3],
  ] as const) {
    const item = await (await POST_ITEM(json({ titulo, estimativa }), ctx(PROJETO))).json();
    await POST_TRANSICAO(json({ para: 'pronto_para_sprint' }), ctx(item.id));
    ids.push(item.id);
  }
  const sprint = await (await POST_SPRINT(vazio('POST'), ctx(PROJETO))).json();
  await PUT_PLANEJAMENTO(json({ meta: 'Meta', itemIds: ids }, 'PUT'), ctx(sprint.id));
  await POST_INICIAR(vazio('POST'), ctx(sprint.id));
  return { sprint, ids };
}

async function concluir(itemId: string) {
  const { definicaoDePronto } = await container.projetos.obter(PROJETO);
  await PUT_DOD(json({ marcados: definicaoDePronto }, 'PUT'), ctx(itemId));
  await POST_TRANSICAO(json({ para: 'concluido' }), ctx(itemId));
}

describe('PUT /sprints/{id}/review', () => {
  it('registra aceite; aceitar item não concluído retorna 409', async () => {
    const { sprint, ids } = await sprintAtiva();
    const [a, b] = ids as [string, string];
    await concluir(a);

    const recusado = await PUT_REVIEW(
      json({ resultados: [{ itemId: b, resultado: 'aceito' }] }, 'PUT'),
      ctx(sprint.id),
    );
    expect(recusado.status).toBe(409);
    expect((await recusado.json()).codigo).toBe('ITEM-NAO-CONCLUIDO');

    const ok = await PUT_REVIEW(
      json(
        {
          resultados: [
            { itemId: a, resultado: 'aceito', feedback: 'Bom' },
            { itemId: b, resultado: 'nao_aceito' },
          ],
        },
        'PUT',
      ),
      ctx(sprint.id),
    );
    expect(ok.status).toBe(200);
    expect((await ok.json()).itens.map((i: { resultado: string }) => i.resultado)).toEqual([
      'aceito',
      'nao_aceito',
    ]);
  });

  it('forma errada retorna 422; sprint inexistente retorna 404', async () => {
    const { sprint } = await sprintAtiva();
    expect(
      (
        await PUT_REVIEW(
          json({ resultados: [{ itemId: 'a', resultado: 'talvez' }] }, 'PUT'),
          ctx(sprint.id),
        )
      ).status,
    ).toBe(422);
    expect((await PUT_REVIEW(json({}, 'PUT'), ctx(sprint.id))).status).toBe(422);
    expect((await PUT_REVIEW(json({ resultados: [] }, 'PUT'), ctx('nada'))).status).toBe(404);
  });
});

describe('PUT /sprints/{id}/retrospectiva', () => {
  it('salva os três blocos', async () => {
    const { sprint } = await sprintAtiva();
    const resposta = await PUT_RETRO(
      json(
        {
          bem: ['Entrega'],
          melhorar: ['Revisão'],
          acoes: [{ descricao: 'Revisar em duplas', prazo: '2026-10-20' }],
        },
        'PUT',
      ),
      ctx(sprint.id),
    );
    expect(resposta.status).toBe(200);
    expect((await resposta.json()).retrospectiva.acoes[0]).toMatchObject({
      descricao: 'Revisar em duplas',
      prazo: '2026-10-20',
      concluida: false,
    });
  });

  it('ação sem descrição retorna 422 apontando o campo; sprint planejada retorna 409', async () => {
    const { sprint } = await sprintAtiva();
    const invalida = await PUT_RETRO(
      json({ bem: [], melhorar: [], acoes: [{ descricao: '' }] }, 'PUT'),
      ctx(sprint.id),
    );
    expect(invalida.status).toBe(422);
    expect((await invalida.json()).erros[0].campo).toBe('acoes.0.descricao');

    const planejada = await (await POST_SPRINT(vazio('POST'), ctx(PROJETO))).json();
    const recusada = await PUT_RETRO(
      json({ bem: [], melhorar: [], acoes: [] }, 'PUT'),
      ctx(planejada.id),
    );
    expect(recusada.status).toBe(409);
  });
});

describe('POST /sprints/{id}/encerrar', () => {
  it('RN-06: aceitos 5 e 3 → velocity 8; não aceitos voltam ao topo (RN-05)', async () => {
    const { sprint, ids } = await sprintAtiva();
    const [a, b] = ids as [string, string];
    await concluir(a);
    await concluir(b);
    await PUT_REVIEW(
      json(
        {
          resultados: [
            { itemId: a, resultado: 'aceito' },
            { itemId: b, resultado: 'aceito' },
          ],
        },
        'PUT',
      ),
      ctx(sprint.id),
    );

    const resposta = await POST_ENCERRAR(vazio('POST'), ctx(sprint.id));
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toMatchObject({ situacao: 'encerrada', velocity: 8 });
    expect((await (await GET(vazio(), ctx(sprint.id))).json()).diasUteisRestantes).toBeNull();
  });

  it('só encerra sprint ativa: de novo retorna 409; inexistente retorna 404', async () => {
    const { sprint } = await sprintAtiva();
    expect((await POST_ENCERRAR(vazio('POST'), ctx(sprint.id))).status).toBe(200);
    const de_novo = await POST_ENCERRAR(vazio('POST'), ctx(sprint.id));
    expect(de_novo.status).toBe(409);
    expect((await de_novo.json()).codigo).toBe('SPRINT-NAO-ATIVA');
    expect((await POST_ENCERRAR(vazio('POST'), ctx('nada'))).status).toBe(404);
  });
});
