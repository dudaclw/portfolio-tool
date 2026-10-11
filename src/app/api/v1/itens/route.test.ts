import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarContainer, definirContainer, type Container } from '@/infra/container';
import { GET as GET_ITENS, POST as POST_ITEM } from '../projetos/[id]/itens/route';
import { DELETE, GET, PATCH } from './[id]/route';
import { PUT as PUT_DOD } from './[id]/definicao-de-pronto/route';
import { DELETE as DELETE_IMPEDIMENTO, PUT as PUT_IMPEDIMENTO } from './[id]/impedimento/route';
import { POST as POST_MOVER } from './[id]/mover/route';
import { POST as POST_TRANSICAO } from './[id]/transicoes/route';

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

const json = (corpo: unknown, metodo = 'POST') =>
  new Request('http://127.0.0.1:3000/api/v1/x', {
    method: metodo,
    headers: { 'content-type': 'application/json' },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  });
const vazio = (metodo = 'GET') => new Request('http://127.0.0.1:3000/api/v1/x', { method: metodo });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const PROJETO = 'id1';
async function criar(corpo: object) {
  return POST_ITEM(json(corpo), ctx(PROJETO));
}

describe('POST /projetos/{id}/itens', () => {
  it('cria no fim do backlog, em `novo`, e responde 201 com Location', async () => {
    const resposta = await criar({ titulo: 'Abrir chamado', estimativa: 5 });
    expect(resposta.status).toBe(201);
    expect(resposta.headers.get('location')).toBe('/api/v1/itens/id2');
    expect(await resposta.json()).toMatchObject({
      id: 'id2',
      projetoId: PROJETO,
      tipo: 'historia',
      estado: 'novo',
      ordem: 1,
      estimativa: 5,
    });
    expect((await (await criar({ titulo: 'Outro' })).json()).ordem).toBe(2);
  });

  it('estimativa 4 retorna 422 com problem+json e não grava nada', async () => {
    const resposta = await criar({ titulo: 'x', estimativa: 4 });
    expect(resposta.status).toBe(422);
    expect(resposta.headers.get('content-type')).toBe('application/problem+json');
    expect((await resposta.json()).erros).toEqual([
      {
        campo: 'estimativa',
        mensagem: 'A estimativa deve ser 1, 2, 3, 5, 8, 13, 21 ou ficar em branco.',
      },
    ]);
    expect(await (await GET_ITENS(vazio(), ctx(PROJETO))).json()).toEqual([]);
  });

  it('forma errada, campo desconhecido ou JSON quebrado retornam 422', async () => {
    expect((await criar({ titulo: 5 })).status).toBe(422);
    expect((await criar({ titulo: 'x', estimativa: '5' })).status).toBe(422);
    expect((await criar({ titulo: 'x', estado: 'concluido' })).status).toBe(422);
    expect((await criar({ titulo: 'x', tipo: 'epico' })).status).toBe(422);
    expect((await POST_ITEM(json('{ quebrado'), ctx(PROJETO))).status).toBe(422);
  });

  it('título em branco retorna 422; projeto inexistente retorna 404', async () => {
    expect((await criar({ titulo: '  ' })).status).toBe(422);
    expect((await POST_ITEM(json({ titulo: 'x' }), ctx('nada'))).status).toBe(404);
  });
});

describe('GET /projetos/{id}/itens e GET/PATCH/DELETE /itens/{id}', () => {
  it('lista na ordem do backlog; 404 em projeto inexistente', async () => {
    await criar({ titulo: 'A' });
    await criar({ titulo: 'B' });
    const lista = await (await GET_ITENS(vazio(), ctx(PROJETO))).json();
    expect(lista.map((i: { titulo: string }) => i.titulo)).toEqual(['A', 'B']);
    expect((await GET_ITENS(vazio(), ctx('nada'))).status).toBe(404);
  });

  it('lê o item com o histórico', async () => {
    await criar({ titulo: 'A' });
    const item = await (await GET(vazio(), ctx('id2'))).json();
    expect(item.historico).toEqual([
      { itemId: 'id2', de: null, para: 'novo', em: '2026-10-09T12:00:00Z' },
    ]);
    expect((await GET(vazio(), ctx('nada'))).status).toBe(404);
  });

  it('edita campos; estimativa 4 e PATCH vazio retornam 422', async () => {
    await criar({ titulo: 'A' });
    const resposta = await PATCH(json({ titulo: 'A2', estimativa: 13 }, 'PATCH'), ctx('id2'));
    expect(await resposta.json()).toMatchObject({ titulo: 'A2', estimativa: 13 });
    expect((await PATCH(json({ estimativa: 4 }, 'PATCH'), ctx('id2'))).status).toBe(422);
    expect((await PATCH(json({}, 'PATCH'), ctx('id2'))).status).toBe(422);
    expect((await PATCH(json({ estado: 'concluido' }, 'PATCH'), ctx('id2'))).status).toBe(422);
    expect((await PATCH(json({ titulo: 'x' }, 'PATCH'), ctx('nada'))).status).toBe(404);
  });

  it('remove com 204; remover de novo retorna 404; item em sprint retorna 409', async () => {
    await criar({ titulo: 'A' });
    await criar({ titulo: 'B' });
    expect((await DELETE(vazio('DELETE'), ctx('id2'))).status).toBe(204);
    expect((await DELETE(vazio('DELETE'), ctx('id2'))).status).toBe(404);

    const b = await container.repositorios.itens.obter('id3');
    await container.repositorios.itens.salvar({ ...b!, sprintId: 's1' });
    const resposta = await DELETE(vazio('DELETE'), ctx('id3'));
    expect(resposta.status).toBe(409);
    expect((await resposta.json()).codigo).toBe('ITEM-EM-SPRINT');
  });
});

describe('POST /itens/{id}/mover', () => {
  it('troca com o vizinho e devolve a lista de 1 a N', async () => {
    await criar({ titulo: 'A' });
    await criar({ titulo: 'B' });
    await criar({ titulo: 'C' });
    const resposta = await POST_MOVER(json({ direcao: 'acima' }), ctx('id4'));
    const lista = await resposta.json();
    expect(lista.map((i: { titulo: string }) => i.titulo)).toEqual(['A', 'C', 'B']);
    expect(lista.map((i: { ordem: number }) => i.ordem)).toEqual([1, 2, 3]);
  });

  it('direção inválida retorna 422; item inexistente retorna 404', async () => {
    await criar({ titulo: 'A' });
    expect((await POST_MOVER(json({ direcao: 'lado' }), ctx('id2'))).status).toBe(422);
    expect((await POST_MOVER(json({ direcao: 'acima' }), ctx('nada'))).status).toBe(404);
  });
});

describe('POST /itens/{id}/transicoes', () => {
  it('muda o estado e grava o histórico', async () => {
    await criar({ titulo: 'A' });
    const resposta = await POST_TRANSICAO(json({ para: 'refinado' }), ctx('id2'));
    expect(resposta.status).toBe(200);
    expect((await resposta.json()).estado).toBe('refinado');
    const { historico } = await (await GET(vazio(), ctx('id2'))).json();
    expect(historico.map((h: { para: string }) => h.para)).toEqual(['novo', 'refinado']);
  });

  it('RN-04: com 3 de 4 critérios retorna 409 com código RN-04; com os 4 conclui', async () => {
    await criar({ titulo: 'A' });
    const { definicaoDePronto } = await container.projetos.obter(PROJETO);

    await PUT_DOD(json({ marcados: definicaoDePronto.slice(0, 3) }, 'PUT'), ctx('id2'));
    const recusada = await POST_TRANSICAO(json({ para: 'concluido' }), ctx('id2'));
    expect(recusada.status).toBe(409);
    expect(recusada.headers.get('content-type')).toBe('application/problem+json');
    expect((await recusada.json()).codigo).toBe('RN-04');

    await PUT_DOD(json({ marcados: definicaoDePronto }, 'PUT'), ctx('id2'));
    const aceita = await POST_TRANSICAO(json({ para: 'concluido' }), ctx('id2'));
    expect(aceita.status).toBe(200);
    expect((await aceita.json()).estado).toBe('concluido');
  });

  it('estado desconhecido ou repetido retorna 422; item inexistente retorna 404', async () => {
    await criar({ titulo: 'A' });
    expect((await POST_TRANSICAO(json({ para: 'voando' }), ctx('id2'))).status).toBe(422);
    expect((await POST_TRANSICAO(json({ para: 'novo' }), ctx('id2'))).status).toBe(422);
    expect((await POST_TRANSICAO(json({ para: 'refinado' }), ctx('nada'))).status).toBe(404);
  });
});

describe('PUT /itens/{id}/definicao-de-pronto', () => {
  it('guarda os critérios; critério desconhecido retorna 422', async () => {
    await criar({ titulo: 'A' });
    const ok = await PUT_DOD(json({ marcados: ['Testado'] }, 'PUT'), ctx('id2'));
    expect((await ok.json()).dodMarcados).toEqual(['Testado']);
    expect((await PUT_DOD(json({ marcados: ['Inventado'] }, 'PUT'), ctx('id2'))).status).toBe(422);
    expect((await PUT_DOD(json({ marcados: 'Testado' }, 'PUT'), ctx('id2'))).status).toBe(422);
  });
});

describe('impedimento', () => {
  it('marca com motivo e remove', async () => {
    await criar({ titulo: 'A' });
    const marcado = await PUT_IMPEDIMENTO(json({ motivo: 'Aguardando API' }, 'PUT'), ctx('id2'));
    expect((await marcado.json()).impedido).toEqual({
      motivo: 'Aguardando API',
      desde: '2026-10-09T12:00:00Z',
    });
    const removido = await DELETE_IMPEDIMENTO(vazio('DELETE'), ctx('id2'));
    expect((await removido.json()).impedido).toBeNull();
  });

  it('sem motivo retorna 422', async () => {
    await criar({ titulo: 'A' });
    expect((await PUT_IMPEDIMENTO(json({ motivo: ' ' }, 'PUT'), ctx('id2'))).status).toBe(422);
    expect((await PUT_IMPEDIMENTO(json({}, 'PUT'), ctx('id2'))).status).toBe(422);
  });
});
