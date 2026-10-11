import { describe, expect, it } from 'vitest';
import { ErroDeValidacao } from '../compartilhado/erro-de-validacao';
import { criarAlocacao, criarAusencia } from './alocacao';
import { criarFeriado } from './feriados';
import { alterarPessoa, criarPessoa } from './pessoa';

function campos(acao: () => unknown): string[] {
  try {
    acao();
  } catch (erro) {
    if (erro instanceof ErroDeValidacao) return erro.campos.map((c) => c.campo);
    throw erro;
  }
  return [];
}

describe('criarPessoa e alterarPessoa', () => {
  it('cria com os dados aparados', () => {
    expect(criarPessoa('p', { nome: ' Ana ', funcao: ' Dev ', jornadaSemanalHoras: 40 })).toEqual({
      id: 'p',
      nome: 'Ana',
      funcao: 'Dev',
      jornadaSemanalHoras: 40,
    });
  });

  it('jornada precisa ser maior que zero; nome é obrigatório', () => {
    expect(campos(() => criarPessoa('p', { nome: 'Ana', jornadaSemanalHoras: 0 }))).toEqual([
      'jornadaSemanalHoras',
    ]);
    expect(campos(() => criarPessoa('p', { nome: 'Ana', jornadaSemanalHoras: -5 }))).toEqual([
      'jornadaSemanalHoras',
    ]);
    expect(campos(() => criarPessoa('p', { nome: ' ', jornadaSemanalHoras: 40 }))).toEqual([
      'nome',
    ]);
  });

  it('altera só o que foi informado e revalida', () => {
    const ana = criarPessoa('p', { nome: 'Ana', funcao: 'Dev', jornadaSemanalHoras: 40 });
    expect(alterarPessoa(ana, { jornadaSemanalHoras: 30 })).toMatchObject({
      nome: 'Ana',
      jornadaSemanalHoras: 30,
    });
    expect(campos(() => alterarPessoa(ana, { jornadaSemanalHoras: 0 }))).toEqual([
      'jornadaSemanalHoras',
    ]);
  });
});

describe('criarAlocacao', () => {
  const valida = {
    pessoaId: 'p',
    projetoId: 'x',
    inicio: '2026-11-02',
    fim: '2026-11-13',
    percentual: 60,
  };

  it('aceita os extremos 1 e 100', () => {
    expect(criarAlocacao('a', { ...valida, percentual: 1 }).percentual).toBe(1);
    expect(criarAlocacao('a', { ...valida, percentual: 100 }).percentual).toBe(100);
  });

  it.each([0, 101, -10, 50.5, Number.NaN])('recusa o percentual %s', (percentual) => {
    expect(campos(() => criarAlocacao('a', { ...valida, percentual }))).toEqual(['percentual']);
  });

  it('recusa fim antes do início e datas inválidas', () => {
    expect(campos(() => criarAlocacao('a', { ...valida, fim: '2026-10-01' }))).toEqual(['fim']);
    expect(campos(() => criarAlocacao('a', { ...valida, inicio: '2026-02-30' }))).toEqual([
      'inicio',
    ]);
  });

  it('período de um dia só é válido', () => {
    expect(() =>
      criarAlocacao('a', { ...valida, inicio: '2026-11-02', fim: '2026-11-02' }),
    ).not.toThrow();
  });
});

describe('criarAusencia e criarFeriado', () => {
  it('ausência: fim não pode ser anterior ao início', () => {
    expect(
      campos(() => criarAusencia('a', { pessoaId: 'p', inicio: '2026-10-07', fim: '2026-10-06' })),
    ).toEqual(['fim']);
    expect(criarAusencia('a', { pessoaId: 'p', inicio: '2026-10-06', fim: '2026-10-07' }).id).toBe(
      'a',
    );
  });

  it('feriado: data válida e nome obrigatório', () => {
    expect(criarFeriado({ data: '2026-12-24', nome: ' Véspera ' })).toEqual({
      data: '2026-12-24',
      nome: 'Véspera',
    });
    expect(campos(() => criarFeriado({ data: '24/12', nome: '' }))).toEqual(['data', 'nome']);
  });
});
