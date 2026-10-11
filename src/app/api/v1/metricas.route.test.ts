import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarContainer, definirContainer } from '@/infra/container';
import { montarDadosDeExemplo } from '@/infra/seed/dados-de-exemplo';
import { GET as GET_PORTFOLIO } from './portfolio/route';
import { GET as GET_PROGRESSO } from './projetos/[id]/progresso/route';
import { GET as GET_VELOCITY } from './projetos/[id]/velocity/route';
import { GET as GET_BURNDOWN } from './sprints/[id]/burndown/route';

let n = 0;
beforeEach(() => {
  n = 0;
  definirContainer(
    criarContainer({
      armazenamento: { tipo: 'memoria', dados: montarDadosDeExemplo(() => `ex-${++n}`) },
      relogio: () => '2026-10-09T12:00:00Z',
    }),
  );
});
afterEach(() => definirContainer(undefined));

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const requisicao = new Request('http://127.0.0.1:3000/api/v1/x');

async function portal() {
  const { hoje, projetos } = await (await GET_PORTFOLIO()).json();
  return { hoje, portal: projetos[0], migracao: projetos[1] };
}

describe('GET /api/v1/portfolio', () => {
  it('lista os projetos com % concluído, sprint atual e alertas, e o "hoje" do relógio', async () => {
    const resposta = await GET_PORTFOLIO();
    expect(resposta.status).toBe(200);
    const { hoje, portal: a, migracao: b } = await portal();
    expect(hoje).toBe('2026-10-09');
    expect(a).toMatchObject({
      nome: 'Portal do Cliente',
      progresso: { percentual: 29, semEstimativa: 1 },
      sprintAtual: { numero: 2, diasUteisRestantes: 2 },
    });
    expect(a.alertas.sobrecarga).toHaveLength(1);
    expect(b).toMatchObject({ nome: 'Migração do RH', sprintAtual: null });
  });
});

describe('GET /api/v1/projetos/{id}/progresso e /velocity', () => {
  it('progresso (RN-11): 21 de 73 pontos, 29%, 1 item sem estimativa', async () => {
    const { portal: a } = await portal();
    const resposta = await GET_PROGRESSO(requisicao, ctx(a.id));
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({
      pontosConcluidos: 21,
      pontosTotais: 73,
      percentual: 29,
      semEstimativa: 1,
    });
  });

  it('velocity: sprint 1 = 13 e média 13; não traz nada por pessoa (RN-09)', async () => {
    const { portal: a } = await portal();
    const corpo = await (await GET_VELOCITY(requisicao, ctx(a.id))).json();
    expect(corpo).toMatchObject({ media: 13, sprints: [{ numero: 1, velocity: 13 }] });
    expect(JSON.stringify(corpo)).not.toMatch(/pessoa/i);
  });

  it('projeto inexistente: 404 com problem+json', async () => {
    for (const rota of [GET_PROGRESSO, GET_VELOCITY]) {
      const resposta = await rota(requisicao, ctx('nada'));
      expect(resposta.status).toBe(404);
      expect(resposta.headers.get('content-type')).toBe('application/problem+json');
    }
  });
});

describe('GET /api/v1/sprints/{id}/burndown', () => {
  it('série por dia útil com escopo, restante e linha ideal', async () => {
    const { portal: a } = await portal();
    const resposta = await GET_BURNDOWN(requisicao, ctx(a.sprintAtual.id));
    expect(resposta.status).toBe(200);
    const corpo = await resposta.json();
    expect(corpo).toMatchObject({ sprintId: a.sprintAtual.id, escopo: 21, restante: 13 });
    expect(corpo.dias[0]).toEqual({ data: '2026-09-29', ideal: 21, escopo: 21, restante: 21 });
    expect(corpo.dias.at(-1)).toEqual({
      data: '2026-10-13',
      ideal: 0,
      escopo: null,
      restante: null,
    });
  });

  it('sprint inexistente: 404', async () => {
    expect((await GET_BURNDOWN(requisicao, ctx('nada'))).status).toBe(404);
  });
});
