import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarContainer, definirContainer, type Container } from '@/infra/container';
import { GET as GET_SPRINTS, POST as POST_SPRINT } from '../projetos/[id]/sprints/route';
import { POST as POST_TRANSICAO } from '../itens/[id]/transicoes/route';
import { POST as POST_ITEM } from '../projetos/[id]/itens/route';
import { PUT as PUT_DATAS } from './[id]/datas/route';
import { POST as POST_INICIAR } from './[id]/iniciar/route';
import { PUT as PUT_PLANEJAMENTO } from './[id]/planejamento/route';
import { GET } from './[id]/route';

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
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  });
const vazio = (metodo = 'GET') => new Request('http://127.0.0.1:3000/api/v1/x', { method: metodo });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function criarSprint(corpo?: object) {
  const resposta = await POST_SPRINT(corpo ? json(corpo) : vazio('POST'), ctx(PROJETO));
  return { resposta, sprint: resposta.status === 201 ? await resposta.json() : null };
}

/** Item pronto para sprint, criado e transicionado pela API. */
async function itemPronto(titulo: string, estimativa = 5): Promise<string> {
  const criado = await (await POST_ITEM(json({ titulo, estimativa }), ctx(PROJETO))).json();
  await POST_TRANSICAO(json({ para: 'pronto_para_sprint' }), ctx(criado.id));
  return criado.id;
}

describe('POST e GET /projetos/{id}/sprints', () => {
  it('cria sem corpo, com as datas pela duração, e responde 201 com Location', async () => {
    const { resposta, sprint } = await criarSprint();
    expect(resposta.status).toBe(201);
    expect(resposta.headers.get('location')).toBe(`/api/v1/sprints/${sprint.id}`);
    expect(sprint).toMatchObject({
      numero: 1,
      inicio: '2026-09-14',
      fim: '2026-09-28',
      situacao: 'planejada',
    });
    expect((await criarSprint()).sprint).toMatchObject({ numero: 2, inicio: '2026-09-29' });
  });

  it('aceita um início escolhido; início inválido, campo desconhecido ou JSON quebrado: 422', async () => {
    expect((await criarSprint({ inicio: '2026-10-19' })).sprint.fim).toBe('2026-11-02');
    expect((await criarSprint({ inicio: '19/10/2026' })).resposta.status).toBe(422);
    expect((await criarSprint({ meta: 'x' })).resposta.status).toBe(422);
    expect((await POST_SPRINT(json('{ quebrado'), ctx(PROJETO))).status).toBe(422);
  });

  it('projeto inexistente: 404 ao criar e ao listar', async () => {
    expect((await POST_SPRINT(vazio('POST'), ctx('nada'))).status).toBe(404);
    expect((await GET_SPRINTS(vazio(), ctx('nada'))).status).toBe(404);
  });

  it('lista por número', async () => {
    await criarSprint();
    await criarSprint();
    const lista = await (await GET_SPRINTS(vazio(), ctx(PROJETO))).json();
    expect(lista.map((s: { numero: number }) => s.numero)).toEqual([1, 2]);
  });
});

describe('GET /sprints/{id}', () => {
  it('lê a sprint; inexistente: 404', async () => {
    const { sprint } = await criarSprint();
    const lida = await (await GET(vazio(), ctx(sprint.id))).json();
    expect(lida).toMatchObject({ id: sprint.id, itens: [], diasUteisRestantes: null });
    expect((await GET(vazio(), ctx('nada'))).status).toBe(404);
  });
});

describe('PUT /sprints/{id}/planejamento', () => {
  it('define a meta e os itens', async () => {
    const { sprint } = await criarSprint();
    const a = await itemPronto('A', 8);
    const resposta = await PUT_PLANEJAMENTO(
      json({ meta: 'Cliente abre chamados', itemIds: [a] }, 'PUT'),
      ctx(sprint.id),
    );
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toMatchObject({
      meta: 'Cliente abre chamados',
      itens: [{ itemId: a, estimativaPlanejada: 8, resultado: null }],
    });
  });

  it('RN-10: item novo retorna 409 com código RN-10', async () => {
    const { sprint } = await criarSprint();
    const novo = await (await POST_ITEM(json({ titulo: 'Novo' }), ctx(PROJETO))).json();
    const resposta = await PUT_PLANEJAMENTO(
      json({ meta: 'M', itemIds: [novo.id] }, 'PUT'),
      ctx(sprint.id),
    );
    expect(resposta.status).toBe(409);
    expect(resposta.headers.get('content-type')).toBe('application/problem+json');
    expect((await resposta.json()).codigo).toBe('RN-10');
  });

  it('forma errada retorna 422; sprint inexistente retorna 404', async () => {
    const { sprint } = await criarSprint();
    expect((await PUT_PLANEJAMENTO(json({ meta: 'M' }, 'PUT'), ctx(sprint.id))).status).toBe(422);
    expect(
      (await PUT_PLANEJAMENTO(json({ meta: 5, itemIds: [] }, 'PUT'), ctx(sprint.id))).status,
    ).toBe(422);
    expect(
      (await PUT_PLANEJAMENTO(json({ meta: 'M', itemIds: ['fantasma'] }, 'PUT'), ctx(sprint.id)))
        .status,
    ).toBe(422);
    expect(
      (await PUT_PLANEJAMENTO(json({ meta: 'M', itemIds: [] }, 'PUT'), ctx('nada'))).status,
    ).toBe(404);
  });

  it('RN-03: com a sprint ativa, trocar a meta retorna 409 e adicionar item é permitido', async () => {
    const { sprint } = await criarSprint();
    const a = await itemPronto('A');
    await PUT_PLANEJAMENTO(json({ meta: 'Original', itemIds: [a] }, 'PUT'), ctx(sprint.id));
    await POST_INICIAR(vazio('POST'), ctx(sprint.id));

    const troca = await PUT_PLANEJAMENTO(
      json({ meta: 'Outra', itemIds: [a] }, 'PUT'),
      ctx(sprint.id),
    );
    expect(troca.status).toBe(409);
    expect((await troca.json()).codigo).toBe('RN-03');

    const b = await itemPronto('B', 3);
    const adicao = await PUT_PLANEJAMENTO(
      json({ meta: 'Original', itemIds: [a, b] }, 'PUT'),
      ctx(sprint.id),
    );
    expect(adicao.status).toBe(200);
    expect((await adicao.json()).itens).toHaveLength(2);
  });
});

describe('POST /sprints/{id}/iniciar', () => {
  it('inicia: 200 e a sprint fica ativa, com dias úteis restantes', async () => {
    const { sprint } = await criarSprint({ inicio: '2026-09-29' });
    const a = await itemPronto('A');
    await PUT_PLANEJAMENTO(json({ meta: 'M', itemIds: [a] }, 'PUT'), ctx(sprint.id));
    const resposta = await POST_INICIAR(vazio('POST'), ctx(sprint.id));
    expect(resposta.status).toBe(200);
    expect((await resposta.json()).situacao).toBe('ativa');
    expect((await (await GET(vazio(), ctx(sprint.id))).json()).diasUteisRestantes).toBe(3);
  });

  it('RN-10: sem meta e sem itens retorna 409', async () => {
    const { sprint } = await criarSprint();
    const resposta = await POST_INICIAR(vazio('POST'), ctx(sprint.id));
    expect(resposta.status).toBe(409);
    expect((await resposta.json()).codigo).toBe('RN-10');
  });

  it('RN-02: com a sprint 1 ativa, iniciar a sprint 2 retorna 409', async () => {
    const primeira = (await criarSprint()).sprint;
    const a = await itemPronto('A');
    await PUT_PLANEJAMENTO(json({ meta: 'M', itemIds: [a] }, 'PUT'), ctx(primeira.id));
    await POST_INICIAR(vazio('POST'), ctx(primeira.id));

    const segunda = (await criarSprint()).sprint;
    const resposta = await POST_INICIAR(vazio('POST'), ctx(segunda.id));
    expect(resposta.status).toBe(409);
    expect((await resposta.json()).codigo).toBe('RN-02');
  });

  it('sprint inexistente: 404', async () => {
    expect((await POST_INICIAR(vazio('POST'), ctx('nada'))).status).toBe(404);
  });
});

describe('PUT /sprints/{id}/datas', () => {
  it('RN-01: sprint ativa retorna 409 e as datas não mudam', async () => {
    const { sprint } = await criarSprint();
    const a = await itemPronto('A');
    await PUT_PLANEJAMENTO(json({ meta: 'M', itemIds: [a] }, 'PUT'), ctx(sprint.id));
    await POST_INICIAR(vazio('POST'), ctx(sprint.id));

    const resposta = await PUT_DATAS(json({ fim: '2026-11-10' }, 'PUT'), ctx(sprint.id));
    expect(resposta.status).toBe(409);
    expect((await resposta.json()).codigo).toBe('RN-01');
    expect((await (await GET(vazio(), ctx(sprint.id))).json()).fim).toBe('2026-09-28');
  });

  it('sprint planejada aceita; fim antes do início, vazio ou data inválida: 422', async () => {
    const { sprint } = await criarSprint();
    const ok = await PUT_DATAS(json({ fim: '2026-09-30' }, 'PUT'), ctx(sprint.id));
    expect((await ok.json()).fim).toBe('2026-09-30');
    expect((await PUT_DATAS(json({ fim: '2026-09-01' }, 'PUT'), ctx(sprint.id))).status).toBe(422);
    expect((await PUT_DATAS(json({}, 'PUT'), ctx(sprint.id))).status).toBe(422);
    expect((await PUT_DATAS(json({ inicio: 'ontem' }, 'PUT'), ctx(sprint.id))).status).toBe(422);
  });
});
