import { describe, expect, it } from 'vitest';
import { montarDadosDeExemplo } from './dados-de-exemplo';

function geradorDeIds() {
  let n = 0;
  return () => `id-${++n}`;
}

describe('montarDadosDeExemplo', () => {
  const dados = montarDadosDeExemplo(geradorDeIds());

  it('traz as quatro pessoas com suas jornadas', () => {
    expect(dados.pessoas.map((p) => [p.nome, p.jornadaSemanalHoras])).toEqual([
      ['Ana', 40],
      ['Bruno', 40],
      ['Carla', 40],
      ['Diego', 30],
    ]);
  });

  it('traz os projetos A e B com as datas do escopo', () => {
    const [a, b] = dados.projetos;
    expect([a?.nome, a?.status, a?.inicio, a?.fimPrevisto, a?.duracaoSprintDias]).toEqual([
      'Portal do Cliente',
      'em_andamento',
      '2026-09-14',
      '2026-12-18',
      15,
    ]);
    expect([b?.nome, b?.status, b?.inicio, b?.fimPrevisto]).toEqual([
      'Migração do RH',
      'planejado',
      '2026-11-02',
      '2027-02-26',
    ]);
  });

  it('usa identificadores únicos', () => {
    const ids = [...dados.pessoas, ...dados.projetos].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
