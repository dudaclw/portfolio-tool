import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarContainer, definirContainer, type Container } from '@/infra/container';
import { DELETE as DELETE_ALOCACAO } from './alocacoes/[id]/route';
import { GET as GET_ALOCACOES, POST as POST_ALOCACAO } from './alocacoes/route';
import { DELETE as DELETE_AUSENCIA } from './ausencias/[id]/route';
import { GET as GET_AUSENCIAS, POST as POST_AUSENCIA } from './ausencias/route';
import { GET as GET_CARGA } from './carga/route';
import { DELETE as DELETE_FERIADO } from './feriados/[data]/route';
import { GET as GET_FERIADOS, POST as POST_FERIADO } from './feriados/route';
import { DELETE as DELETE_PESSOA, PATCH as PATCH_PESSOA } from './pessoas/[id]/route';
import { GET as GET_PESSOAS, POST as POST_PESSOA } from './pessoas/route';
import { GET as GET_CAPACIDADE } from './sprints/[id]/capacidade/route';

let container: Container;

beforeEach(async () => {
  let n = 0;
  container = criarContainer({
    armazenamento: { tipo: 'memoria' },
    relogio: () => '2026-10-09T12:00:00Z',
    gerarId: () => `id${++n}`,
  });
  definirContainer(container);
  await container.projetos.criar({ nome: 'A', inicio: '2026-09-14', fimPrevisto: '2026-12-18' }); // id1
});

afterEach(() => definirContainer(undefined));

const PROJETO = 'id1';
const url = (caminho = '') => `http://127.0.0.1:3000/api/v1/x${caminho}`;
const json = (corpo: unknown, metodo = 'POST') =>
  new Request(url(), {
    method: metodo,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  });
const ctx = <T extends object>(params: T) => ({ params: Promise.resolve(params) });

async function novaPessoa(nome: string, jornadaSemanalHoras = 40) {
  const resposta = await POST_PESSOA(json({ nome, funcao: 'Dev', jornadaSemanalHoras }));
  return (await resposta.json()) as { id: string };
}

describe('/pessoas', () => {
  it('cria (201), edita e lista em ordem alfabética', async () => {
    const resposta = await POST_PESSOA(json({ nome: 'Bruno', jornadaSemanalHoras: 40 }));
    expect(resposta.status).toBe(201);
    expect(resposta.headers.get('location')).toMatch(/^\/api\/v1\/pessoas\//);
    const ana = await novaPessoa('Ana');
    const editada = await PATCH_PESSOA(
      json({ jornadaSemanalHoras: 30 }, 'PATCH'),
      ctx({ id: ana.id }),
    );
    expect((await editada.json()).jornadaSemanalHoras).toBe(30);
    const lista = await (await GET_PESSOAS()).json();
    expect(lista.map((p: { nome: string }) => p.nome)).toEqual(['Ana', 'Bruno']);
  });

  it('jornada 0 ou negativa retorna 422; forma errada retorna 422; inexistente retorna 404', async () => {
    expect((await POST_PESSOA(json({ nome: 'Ana', jornadaSemanalHoras: 0 }))).status).toBe(422);
    expect((await POST_PESSOA(json({ nome: 'Ana', jornadaSemanalHoras: -3 }))).status).toBe(422);
    expect((await POST_PESSOA(json({ nome: 'Ana', jornadaSemanalHoras: '40' }))).status).toBe(422);
    expect(
      (await POST_PESSOA(json({ nome: 'Ana', jornadaSemanalHoras: 40, extra: 1 }))).status,
    ).toBe(422);
    expect((await PATCH_PESSOA(json({}, 'PATCH'), ctx({ id: 'x' }))).status).toBe(422);
    expect((await PATCH_PESSOA(json({ nome: 'x' }, 'PATCH'), ctx({ id: 'nada' }))).status).toBe(
      404,
    );
    expect(
      (await DELETE_PESSOA(new Request(url(), { method: 'DELETE' }), ctx({ id: 'nada' }))).status,
    ).toBe(404);
  });

  it('remove com 204', async () => {
    const ana = await novaPessoa('Ana');
    expect(
      (await DELETE_PESSOA(new Request(url(), { method: 'DELETE' }), ctx({ id: ana.id }))).status,
    ).toBe(204);
    expect(await (await GET_PESSOAS()).json()).toEqual([]);
  });
});

describe('/alocacoes', () => {
  const corpo = (pessoaId: string, extras: object = {}) => ({
    pessoaId,
    projetoId: PROJETO,
    inicio: '2026-11-02',
    fim: '2026-11-13',
    percentual: 60,
    ...extras,
  });

  it('cria com 201 e `avisos` vazio quando a pessoa não passa de 100%', async () => {
    const ana = await novaPessoa('Ana');
    const resposta = await POST_ALOCACAO(json(corpo(ana.id)));
    expect(resposta.status).toBe(201);
    expect(await resposta.json()).toMatchObject({ pessoaId: ana.id, percentual: 60, avisos: [] });
  });

  it('RN-08: passar de 100% grava e avisa com o pico de 110%', async () => {
    const diego = await novaPessoa('Diego', 30);
    await container.projetos.criar({ nome: 'B', inicio: '2026-11-02', fimPrevisto: '2027-02-26' }); // id3? (id1 é A)
    const projetos = await container.projetos.listar();
    const outro = projetos.find((p) => p.nome === 'B')!.id;
    await POST_ALOCACAO(json(corpo(diego.id, { percentual: 60 })));
    const resposta = await POST_ALOCACAO(
      json(corpo(diego.id, { projetoId: outro, percentual: 50 })),
    );
    expect(resposta.status).toBe(201);
    const { avisos } = await resposta.json();
    expect(avisos).toEqual([expect.objectContaining({ codigo: 'RN-08', pico: 110 })]);
    expect(
      await (await GET_ALOCACOES(new Request(url('?pessoaId=' + diego.id)))).json(),
    ).toHaveLength(2);
  });

  it('percentual fora de 1 a 100 retorna 422; pessoa ou projeto inexistente retorna 422', async () => {
    const ana = await novaPessoa('Ana');
    for (const percentual of [0, 101, 50.5]) {
      expect((await POST_ALOCACAO(json(corpo(ana.id, { percentual })))).status).toBe(422);
    }
    expect((await POST_ALOCACAO(json(corpo('fantasma')))).status).toBe(422);
    expect((await POST_ALOCACAO(json(corpo(ana.id, { projetoId: 'fantasma' })))).status).toBe(422);
    expect((await POST_ALOCACAO(json(corpo(ana.id, { fim: '2026-10-01' })))).status).toBe(422);
  });

  it('filtra por projeto, rejeita filtro desconhecido e remove com 204/404', async () => {
    const ana = await novaPessoa('Ana');
    const criada = await (await POST_ALOCACAO(json(corpo(ana.id)))).json();
    expect(
      await (await GET_ALOCACOES(new Request(url(`?projetoId=${PROJETO}`)))).json(),
    ).toHaveLength(1);
    expect(await (await GET_ALOCACOES(new Request(url('?projetoId=outro')))).json()).toEqual([]);
    expect((await GET_ALOCACOES(new Request(url('?foo=1')))).status).toBe(422);
    expect(
      (await DELETE_ALOCACAO(new Request(url(), { method: 'DELETE' }), ctx({ id: criada.id })))
        .status,
    ).toBe(204);
    expect(
      (await DELETE_ALOCACAO(new Request(url(), { method: 'DELETE' }), ctx({ id: criada.id })))
        .status,
    ).toBe(404);
  });
});

describe('/ausencias e /feriados', () => {
  it('ausência: cria, lista, valida e remove', async () => {
    const ana = await novaPessoa('Ana');
    const criada = await POST_AUSENCIA(
      json({ pessoaId: ana.id, inicio: '2026-10-06', fim: '2026-10-07' }),
    );
    expect(criada.status).toBe(201);
    expect(await (await GET_AUSENCIAS(new Request(url()))).json()).toHaveLength(1);
    expect(
      (await POST_AUSENCIA(json({ pessoaId: ana.id, inicio: '2026-10-07', fim: '2026-10-06' })))
        .status,
    ).toBe(422);
    expect(
      (await POST_AUSENCIA(json({ pessoaId: 'fantasma', inicio: '2026-10-06', fim: '2026-10-07' })))
        .status,
    ).toBe(422);
    const { id } = await criada.json();
    expect(
      (await DELETE_AUSENCIA(new Request(url(), { method: 'DELETE' }), ctx({ id }))).status,
    ).toBe(204);
    expect(
      (await DELETE_AUSENCIA(new Request(url(), { method: 'DELETE' }), ctx({ id }))).status,
    ).toBe(404);
  });

  it('feriado: cria, repetido retorna 422, remove por data (204) e depois 404', async () => {
    expect((await POST_FERIADO(json({ data: '2026-12-24', nome: 'Véspera' }))).status).toBe(201);
    expect((await POST_FERIADO(json({ data: '2026-12-24', nome: 'Outra' }))).status).toBe(422);
    expect((await POST_FERIADO(json({ data: '24/12', nome: 'x' }))).status).toBe(422);
    expect(await (await GET_FERIADOS()).json()).toEqual([{ data: '2026-12-24', nome: 'Véspera' }]);
    expect(
      (await DELETE_FERIADO(new Request(url(), { method: 'DELETE' }), ctx({ data: '2026-12-24' })))
        .status,
    ).toBe(204);
    expect(
      (await DELETE_FERIADO(new Request(url(), { method: 'DELETE' }), ctx({ data: '2026-12-24' })))
        .status,
    ).toBe(404);
  });
});

describe('/carga e /sprints/{id}/capacidade', () => {
  it('carga: sem parâmetros usa 12 semanas; datas inválidas retornam 422', async () => {
    const corpo = await (await GET_CARGA(new Request(url()))).json();
    expect(corpo).toMatchObject({ de: '2026-10-05', ate: '2026-12-27', avisos: [] });
    expect(corpo.semanas).toHaveLength(12);
    expect((await GET_CARGA(new Request(url('?de=ontem')))).status).toBe(422);
    expect((await GET_CARGA(new Request(url('?de=2026-11-02&ate=2026-10-01')))).status).toBe(422);
    expect((await GET_CARGA(new Request(url('?quando=hoje')))).status).toBe(422);
  });

  it('capacidade: horas por pessoa e total (RN-07); sprint inexistente retorna 404', async () => {
    const ana = await novaPessoa('Ana');
    await POST_ALOCACAO(
      json({
        pessoaId: ana.id,
        projetoId: PROJETO,
        inicio: '2026-09-14',
        fim: '2026-12-18',
        percentual: 100,
      }),
    );
    const sprint = await container.sprints.criar(PROJETO, { inicio: '2026-10-19' });
    const resposta = await GET_CAPACIDADE(new Request(url()), ctx({ id: sprint.id }));
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toMatchObject({
      horasTotais: 88, // 11 dias úteis × 8 h (19/10 a 02/11, sem feriados cadastrados)
      pessoas: [{ nome: 'Ana', diasUteis: 11, horas: 88 }],
    });
    expect((await GET_CAPACIDADE(new Request(url()), ctx({ id: 'nada' }))).status).toBe(404);
  });
});
