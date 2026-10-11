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

  it('o backlog do projeto A tem 8 itens: 7 estimados (3, 5, 8, 2, 5, 13, 3) e 1 sem estimativa', () => {
    const [a] = dados.projetos;
    const itens = dados.itens
      .filter((i) => i.projetoId === a?.id)
      .sort((x, y) => x.ordem - y.ordem);
    expect(itens.map((i) => i.estimativa)).toEqual([3, 5, 8, 2, 5, 13, 3, null]);
    expect(new Set(itens.map((i) => i.estado))).toEqual(
      new Set(['novo', 'refinado', 'pronto_para_sprint']),
    );
    expect(itens.every((i) => i.sprintId === null)).toBe(true);
  });

  it('o projeto B tem 5 itens, todos novos', () => {
    const [, b] = dados.projetos;
    const itens = dados.itens.filter((i) => i.projetoId === b?.id);
    expect(itens).toHaveLength(5);
    expect(itens.every((i) => i.estado === 'novo')).toBe(true);
  });

  it('as posições de cada projeto vão de 1 a N, sem lacunas', () => {
    for (const projeto of dados.projetos) {
      const ordens = dados.itens
        .filter((i) => i.projetoId === projeto.id)
        .map((i) => i.ordem)
        .sort((x, y) => x - y);
      expect(ordens).toEqual(ordens.map((_, indice) => indice + 1));
    }
  });

  it('o histórico de cada item é coerente: abre em `novo`, encadeia de → para e termina no estado atual', () => {
    for (const item of dados.itens) {
      const registros = dados.historico.filter((h) => h.itemId === item.id);
      expect(registros[0]).toMatchObject({ de: null, para: 'novo' });
      registros.forEach((registro, i) => {
        if (i > 0) expect(registro.de).toBe(registros[i - 1]?.para);
        if (i > 0) expect(registro.em > (registros[i - 1]?.em ?? '')).toBe(true);
      });
      expect(registros.at(-1)?.para).toBe(item.estado);
    }
  });

  it('usa identificadores únicos', () => {
    const ids = [...dados.pessoas, ...dados.projetos, ...dados.itens].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
