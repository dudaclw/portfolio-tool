import { describe, expect, it } from 'vitest';
import { avisosDeSobrecarga, mapaDeCarga } from './carga';
import type { Alocacao, Pessoa } from './recursos';

const pessoa: Pessoa = { id: 'p', nome: 'Diego', funcao: 'Designer', jornadaSemanalHoras: 30 };
const aloc = (projetoId: string, percentual: number, inicio: string, fim: string): Alocacao => ({
  id: `${projetoId}-${inicio}`,
  pessoaId: 'p',
  projetoId,
  inicio,
  fim,
  percentual,
});

describe('RN-08: aviso de sobrecarga', () => {
  it('60% no projeto X e 50% no Y de 2026-11-02 a 2026-11-13 → aviso com pico de 110%', () => {
    const avisos = avisosDeSobrecarga(
      pessoa,
      [aloc('X', 60, '2026-11-02', '2026-11-13'), aloc('Y', 50, '2026-11-02', '2026-11-13')],
      '2026-11-02',
      '2026-11-13',
    );
    expect(avisos).toEqual([
      {
        codigo: 'RN-08',
        pessoaId: 'p',
        pico: 110,
        de: '2026-11-02',
        ate: '2026-11-13',
        mensagem: 'Diego está com 110% de alocação (acima de 100%) de 02/11/2026 a 13/11/2026.',
      },
    ]);
  });

  it('exatamente 100% não é sobrecarga', () => {
    expect(
      avisosDeSobrecarga(
        pessoa,
        [aloc('X', 60, '2026-11-02', '2026-11-13'), aloc('Y', 40, '2026-11-02', '2026-11-13')],
        '2026-11-02',
        '2026-11-13',
      ),
    ).toEqual([]);
  });

  it('só olha o intervalo pedido: sobrecarga fora dele não aparece', () => {
    const alocacoes = [
      aloc('X', 60, '2026-11-02', '2026-12-18'),
      aloc('Y', 50, '2026-11-02', '2026-12-18'),
    ];
    expect(avisosDeSobrecarga(pessoa, alocacoes, '2026-10-01', '2026-10-31')).toEqual([]);
    const recortado = avisosDeSobrecarga(pessoa, alocacoes, '2026-12-10', '2027-01-10');
    expect(recortado).toHaveLength(1);
    expect([recortado[0]?.de, recortado[0]?.ate]).toEqual(['2026-12-10', '2026-12-18']);
  });

  it('dois trechos separados por uma folga geram dois avisos; o pico é o maior do trecho', () => {
    const alocacoes = [
      aloc('X', 100, '2026-11-02', '2026-11-30'),
      aloc('Y', 10, '2026-11-02', '2026-11-06'),
      aloc('Z', 30, '2026-11-04', '2026-11-05'),
      aloc('W', 5, '2026-11-16', '2026-11-17'),
    ];
    const avisos = avisosDeSobrecarga(pessoa, alocacoes, '2026-11-01', '2026-11-30');
    expect(avisos.map((a) => [a.de, a.ate, a.pico])).toEqual([
      ['2026-11-02', '2026-11-06', 140],
      ['2026-11-16', '2026-11-17', 105],
    ]);
  });
});

describe('mapaDeCarga', () => {
  // Dados de exemplo: Diego 60% em A (até 18/12) e 50% em B (de 02/11 a 26/02/2027).
  const alocacoes = [
    aloc('A', 60, '2026-09-14', '2026-12-18'),
    aloc('B', 50, '2026-11-02', '2027-02-26'),
  ];

  it('as semanas começam na segunda-feira da data inicial', () => {
    const mapa = mapaDeCarga([pessoa], alocacoes, '2026-10-09', '2026-10-25');
    expect(mapa.semanas).toEqual(['2026-10-05', '2026-10-12', '2026-10-19']);
  });

  it('Diego tem 110% em todas as semanas de 02/11 a 18/12 e 60% antes', () => {
    const mapa = mapaDeCarga([pessoa], alocacoes, '2026-10-26', '2026-12-21');
    const picos = Object.fromEntries(mapa.pessoas[0]!.semanas.map((s) => [s.inicio, s.pico]));
    expect(picos['2026-10-26']).toBe(60);
    for (const semana of [
      '2026-11-02',
      '2026-11-09',
      '2026-11-16',
      '2026-11-23',
      '2026-11-30',
      '2026-12-07',
      '2026-12-14',
    ]) {
      expect(picos[semana]).toBe(110);
    }
    expect(picos['2026-12-21']).toBe(50);
  });

  it('pessoa sem alocação aparece com pico 0 e as pessoas saem em ordem alfabética', () => {
    const ana: Pessoa = { id: 'ana', nome: 'Ana', funcao: '', jornadaSemanalHoras: 40 };
    const mapa = mapaDeCarga([pessoa, ana], alocacoes, '2026-11-02', '2026-11-08');
    expect(mapa.pessoas.map((p) => p.nome)).toEqual(['Ana', 'Diego']);
    expect(mapa.pessoas[0]?.semanas).toEqual([{ inicio: '2026-11-02', pico: 0 }]);
  });

  it('uma semana vale pelo pior dia, mesmo que a sobrecarga comece no meio dela', () => {
    const mapa = mapaDeCarga(
      [pessoa],
      [aloc('A', 60, '2026-11-02', '2026-11-30'), aloc('B', 50, '2026-11-05', '2026-11-30')],
      '2026-11-02',
      '2026-11-08',
    );
    expect(mapa.pessoas[0]?.semanas[0]?.pico).toBe(110);
  });
});
