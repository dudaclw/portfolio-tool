import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarContainer, definirContainer } from '@/infra/container';
import { GET as GET_PROJETO, PATCH } from './[id]/route';
import { GET, POST } from './route';

beforeEach(() => {
  let n = 0;
  definirContainer(
    criarContainer({
      armazenamento: { tipo: 'memoria' },
      relogio: () => '2026-10-09T12:00:00Z',
      gerarId: () => `p${++n}`,
    }),
  );
});

afterEach(() => definirContainer(undefined));

const json = (corpo: unknown, metodo = 'POST') =>
  new Request('http://127.0.0.1:3000/api/v1/projetos', {
    method: metodo,
    headers: { 'content-type': 'application/json' },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  });

const contexto = (id: string) => ({ params: Promise.resolve({ id }) });

const valido = { nome: 'Portal do Cliente', inicio: '2026-09-14', fimPrevisto: '2026-12-18' };

describe('POST /api/v1/projetos', () => {
  it('cria o projeto com os padrões e responde 201 com Location', async () => {
    const resposta = await POST(json(valido));
    expect(resposta.status).toBe(201);
    expect(resposta.headers.get('location')).toBe('/api/v1/projetos/p1');
    expect(await resposta.json()).toMatchObject({
      id: 'p1',
      nome: 'Portal do Cliente',
      status: 'planejado',
      duracaoSprintDias: 15,
      definicaoDePronto: expect.arrayContaining(['Testado']),
    });
  });

  it('fim previsto anterior ao início retorna 422 com problem+json', async () => {
    const resposta = await POST(
      json({ ...valido, inicio: '2026-12-18', fimPrevisto: '2026-09-14' }),
    );
    expect(resposta.status).toBe(422);
    expect(resposta.headers.get('content-type')).toBe('application/problem+json');
    const corpo = await resposta.json();
    expect(corpo.erros).toEqual([
      {
        campo: 'fimPrevisto',
        mensagem: 'O fim previsto não pode ser anterior ao início do projeto.',
      },
    ]);
    expect(await (await GET()).json()).toEqual([]);
  });

  it('campos ausentes, de tipo errado ou desconhecidos retornam 422 listando os campos', async () => {
    const resposta = await POST(json({ nome: 5, inicio: '14/09/2026', extra: true }));
    expect(resposta.status).toBe(422);
    const campos = (await resposta.json()).erros.map((e: { campo: string }) => e.campo);
    expect(campos).toEqual(expect.arrayContaining(['nome', 'inicio', 'fimPrevisto', 'extra']));
  });

  it('data inexistente retorna 422', async () => {
    const resposta = await POST(json({ ...valido, inicio: '2026-02-30' }));
    expect(resposta.status).toBe(422);
  });

  it('corpo que não é JSON retorna 422', async () => {
    const resposta = await POST(json('{ quebrado'));
    expect(resposta.status).toBe(422);
    expect((await resposta.json()).erros[0].campo).toBe('corpo');
  });

  it('estimativa de sprint inválida retorna 422', async () => {
    expect((await POST(json({ ...valido, duracaoSprintDias: 0 }))).status).toBe(422);
    expect((await POST(json({ ...valido, duracaoSprintDias: 2.5 }))).status).toBe(422);
  });
});

describe('GET /api/v1/projetos', () => {
  it('lista os projetos por data de início', async () => {
    await POST(json({ ...valido, nome: 'B', inicio: '2026-11-02' }));
    await POST(json({ ...valido, nome: 'A' }));
    const resposta = await GET();
    expect(resposta.status).toBe(200);
    expect((await resposta.json()).map((p: { nome: string }) => p.nome)).toEqual(['A', 'B']);
  });
});

describe('GET e PATCH /api/v1/projetos/{id}', () => {
  it('lê um projeto', async () => {
    await POST(json(valido));
    const resposta = await GET_PROJETO(new Request('http://x/'), contexto('p1'));
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toMatchObject({ id: 'p1', nome: 'Portal do Cliente' });
  });

  it('projeto inexistente retorna 404 com problem+json', async () => {
    const resposta = await GET_PROJETO(new Request('http://x/'), contexto('nada'));
    expect(resposta.status).toBe(404);
    expect(resposta.headers.get('content-type')).toBe('application/problem+json');
  });

  it('edita dados, status e Definição de Pronto', async () => {
    await POST(json(valido));
    const resposta = await PATCH(
      json({ status: 'em_andamento', definicaoDePronto: ['Testado', 'Publicado'] }, 'PATCH'),
      contexto('p1'),
    );
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toMatchObject({
      status: 'em_andamento',
      definicaoDePronto: ['Testado', 'Publicado'],
    });
    const lido = await (await GET_PROJETO(new Request('http://x/'), contexto('p1'))).json();
    expect(lido.status).toBe('em_andamento');
  });

  it('edição que deixa o período inconsistente retorna 422 e não altera nada', async () => {
    await POST(json(valido));
    const resposta = await PATCH(json({ fimPrevisto: '2026-01-01' }, 'PATCH'), contexto('p1'));
    expect(resposta.status).toBe(422);
    const lido = await (await GET_PROJETO(new Request('http://x/'), contexto('p1'))).json();
    expect(lido.fimPrevisto).toBe('2026-12-18');
  });

  it('PATCH vazio ou com status desconhecido retorna 422', async () => {
    await POST(json(valido));
    expect((await PATCH(json({}, 'PATCH'), contexto('p1'))).status).toBe(422);
    expect((await PATCH(json({ status: 'voando' }, 'PATCH'), contexto('p1'))).status).toBe(422);
  });

  it('PATCH em projeto inexistente retorna 404', async () => {
    const resposta = await PATCH(json({ nome: 'x' }, 'PATCH'), contexto('nada'));
    expect(resposta.status).toBe(404);
  });
});
