import { describe, expect, it } from 'vitest';
import { capacidadeDaSprint } from './capacidade';
import type { Alocacao, Ausencia, Pessoa } from './recursos';

const ana: Pessoa = { id: 'ana', nome: 'Ana', funcao: 'Dev', jornadaSemanalHoras: 40 };
const bruno: Pessoa = { id: 'bruno', nome: 'Bruno', funcao: 'Dev', jornadaSemanalHoras: 40 };
const carla: Pessoa = { id: 'carla', nome: 'Carla', funcao: 'PO', jornadaSemanalHoras: 40 };
const diego: Pessoa = { id: 'diego', nome: 'Diego', funcao: 'Design', jornadaSemanalHoras: 30 };

const alocacao = (
  pessoaId: string,
  projetoId: string,
  percentual: number,
  inicio = '2026-01-01',
  fim = '2027-12-31',
): Alocacao => ({
  id: `${pessoaId}-${projetoId}-${inicio}`,
  pessoaId,
  projetoId,
  inicio,
  fim,
  percentual,
});

describe('RN-07: exemplo da seção 4 (sprint de 2026-10-19 a 2026-11-02, feriado em 02/11)', () => {
  const ausencias: Ausencia[] = [
    { id: 'a1', pessoaId: 'bruno', inicio: '2026-10-21', fim: '2026-10-22' }, // 2 dias úteis
  ];
  const resultado = capacidadeDaSprint({
    inicio: '2026-10-19',
    fim: '2026-11-02',
    projetoId: 'A',
    pessoas: [ana, bruno],
    alocacoes: [alocacao('ana', 'A', 100), alocacao('bruno', 'A', 50)],
    ausencias,
    feriados: ['2026-11-02'],
  });

  it('são 10 dias úteis: Ana 80 h, Bruno 32 h, total 112 h', () => {
    expect(resultado.pessoas).toEqual([
      { pessoaId: 'ana', nome: 'Ana', diasUteis: 10, horas: 80 },
      { pessoaId: 'bruno', nome: 'Bruno', diasUteis: 8, horas: 32 },
    ]);
    expect(resultado.horasTotais).toBe(112);
  });
});

describe('RN-07: sprint 3 dos dados de exemplo (14/10 a 28/10, 11 dias úteis)', () => {
  const feriados = ['2026-10-12'];
  const resultado = capacidadeDaSprint({
    inicio: '2026-10-14',
    fim: '2026-10-28',
    projetoId: 'A',
    pessoas: [diego, carla, bruno, ana],
    alocacoes: [
      alocacao('ana', 'A', 100, '2026-09-14', '2026-12-18'),
      alocacao('bruno', 'A', 100, '2026-09-14', '2026-12-18'),
      alocacao('carla', 'A', 50, '2026-09-14', '2026-12-18'),
      alocacao('diego', 'A', 60, '2026-09-14', '2026-12-18'),
      alocacao('diego', 'B', 50, '2026-11-02', '2027-02-26'),
    ],
    ausencias: [{ id: 'a', pessoaId: 'bruno', inicio: '2026-10-06', fim: '2026-10-07' }],
    feriados,
  });

  it('Ana 88 h, Bruno 88 h, Carla 44 h, Diego 39,6 h; total 259,6 h', () => {
    expect(resultado.pessoas.map((p) => [p.nome, p.horas])).toEqual([
      ['Ana', 88],
      ['Bruno', 88],
      ['Carla', 44],
      ['Diego', 39.6],
    ]);
    expect(resultado.horasTotais).toBe(259.6);
  });
});

describe('RN-07: detalhes', () => {
  const base = {
    inicio: '2026-10-19',
    fim: '2026-10-23',
    projetoId: 'A',
    feriados: [] as string[],
  };

  it('só conta a alocação do projeto da sprint', () => {
    const r = capacidadeDaSprint({
      ...base,
      pessoas: [ana],
      alocacoes: [alocacao('ana', 'A', 50), alocacao('ana', 'B', 50)],
      ausencias: [],
    });
    expect(r.horasTotais).toBe(20); // 5 dias × 8 h × 50%
  });

  it('alocação que cobre só parte da sprint conta só os dias cobertos', () => {
    const r = capacidadeDaSprint({
      ...base,
      pessoas: [ana],
      alocacoes: [alocacao('ana', 'A', 100, '2026-10-21', '2026-12-31')],
      ausencias: [],
    });
    expect(r.pessoas[0]?.horas).toBe(24); // 21, 22 e 23/10
  });

  it('duas alocações no mesmo projeto no mesmo dia somam os percentuais', () => {
    const r = capacidadeDaSprint({
      ...base,
      pessoas: [ana],
      alocacoes: [alocacao('ana', 'A', 30), { ...alocacao('ana', 'A', 20), id: 'outra' }],
      ausencias: [],
    });
    expect(r.horasTotais).toBe(20);
  });

  it('pessoa sem alocação no projeto não aparece; sem ninguém, o total é 0', () => {
    const r = capacidadeDaSprint({
      ...base,
      pessoas: [ana],
      alocacoes: [alocacao('ana', 'B', 100)],
      ausencias: [],
    });
    expect(r).toEqual({ horasTotais: 0, pessoas: [] });
  });

  it('pessoa ausente a sprint toda aparece com 0 hora e 0 dia', () => {
    const r = capacidadeDaSprint({
      ...base,
      pessoas: [ana],
      alocacoes: [alocacao('ana', 'A', 100)],
      ausencias: [{ id: 'a', pessoaId: 'ana', inicio: '2026-10-01', fim: '2026-10-31' }],
    });
    expect(r.pessoas).toEqual([{ pessoaId: 'ana', nome: 'Ana', diasUteis: 0, horas: 0 }]);
  });

  it('feriado no meio da semana tira o dia; ausência de outra pessoa não interfere', () => {
    const r = capacidadeDaSprint({
      ...base,
      pessoas: [ana],
      alocacoes: [alocacao('ana', 'A', 100)],
      ausencias: [{ id: 'a', pessoaId: 'bruno', inicio: '2026-10-19', fim: '2026-10-23' }],
      feriados: ['2026-10-21'],
    });
    expect(r.horasTotais).toBe(32);
  });
});
