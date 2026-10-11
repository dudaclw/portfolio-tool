import { describe, expect, it } from 'vitest';
import { ErroDeRegra } from '../compartilhado/erro-de-regra';
import { ErroDeValidacao } from '../compartilhado/erro-de-validacao';
import { acoesEmAbertoDaUltimaRetrospectiva, registrarRetrospectiva } from './retrospectiva';
import { criarSprint, type Sprint } from './sprint';

const sprint = (numero: number, parcial: Partial<Sprint> = {}): Sprint => ({
  ...criarSprint(`s${numero}`, 'p1', numero, '2026-09-29', 15),
  situacao: 'ativa',
  ...parcial,
});

let n = 0;
const id = () => `acao${++n}`;

describe('registrarRetrospectiva', () => {
  it('guarda os três blocos, descartando linhas em branco e aparando espaços', () => {
    const depois = registrarRetrospectiva(
      sprint(2),
      {
        bem: [' Entrega no prazo ', '  '],
        melhorar: ['Revisões demoradas'],
        acoes: [{ descricao: 'Revisar em duplas', responsavelId: 'ana', prazo: '2026-10-20' }],
      },
      id,
    );
    expect(depois.retrospectiva).toEqual({
      bem: ['Entrega no prazo'],
      melhorar: ['Revisões demoradas'],
      acoes: [
        {
          id: expect.any(String),
          descricao: 'Revisar em duplas',
          responsavelId: 'ana',
          prazo: '2026-10-20',
          concluida: false,
        },
      ],
    });
  });

  it('ação sem responsável nem prazo não leva esses campos; ids existentes são mantidos', () => {
    const depois = registrarRetrospectiva(
      sprint(2),
      {
        bem: [],
        melhorar: [],
        acoes: [{ id: 'velha', descricao: 'X', responsavelId: null, prazo: null, concluida: true }],
      },
      id,
    );
    expect(depois.retrospectiva?.acoes[0]).toEqual({
      id: 'velha',
      descricao: 'X',
      concluida: true,
    });
  });

  it('descrição vazia e prazo inválido são validação com o campo indicado', () => {
    try {
      registrarRetrospectiva(
        sprint(2),
        { bem: [], melhorar: [], acoes: [{ descricao: ' ' }, { descricao: 'ok', prazo: '31/12' }] },
        id,
      );
      expect.unreachable();
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDeValidacao);
      expect((erro as ErroDeValidacao).campos.map((c) => c.campo)).toEqual([
        'acoes.0.descricao',
        'acoes.1.prazo',
      ]);
    }
  });

  it('vale com a sprint ativa e encerrada, mas não planejada', () => {
    const entrada = { bem: [], melhorar: [], acoes: [] };
    expect(() => registrarRetrospectiva(sprint(2), entrada, id)).not.toThrow();
    expect(() =>
      registrarRetrospectiva(sprint(2, { situacao: 'encerrada' }), entrada, id),
    ).not.toThrow();
    try {
      registrarRetrospectiva(sprint(2, { situacao: 'planejada' }), entrada, id);
      expect.unreachable();
    } catch (erro) {
      expect((erro as ErroDeRegra).codigo).toBe('SPRINT-NAO-INICIADA');
    }
  });
});

describe('acoesEmAbertoDaUltimaRetrospectiva', () => {
  const comRetro = (numero: number, acoes: { descricao: string; concluida: boolean }[]) =>
    sprint(numero, {
      retrospectiva: {
        bem: [],
        melhorar: [],
        acoes: acoes.map((a, i) => ({ id: `${numero}-${i}`, ...a })),
      },
    });

  it('sem retrospectiva em nenhuma sprint, devolve null', () => {
    expect(acoesEmAbertoDaUltimaRetrospectiva([sprint(1), sprint(2)])).toBeNull();
  });

  it('usa a retrospectiva da sprint de maior número e só as ações não concluídas', () => {
    const sprints = [
      comRetro(1, [{ descricao: 'velha', concluida: false }]),
      comRetro(2, [
        { descricao: 'feita', concluida: true },
        { descricao: 'aberta', concluida: false },
      ]),
      sprint(3),
    ];
    const resultado = acoesEmAbertoDaUltimaRetrospectiva(sprints);
    expect(resultado?.sprintNumero).toBe(2);
    expect(resultado?.acoes.map((a) => a.descricao)).toEqual(['aberta']);
  });

  it('com `antesDaSprint`, ignora a própria sprint e as posteriores', () => {
    const sprints = [
      comRetro(1, [{ descricao: 'da 1', concluida: false }]),
      comRetro(2, [{ descricao: 'da 2', concluida: false }]),
    ];
    expect(acoesEmAbertoDaUltimaRetrospectiva(sprints, 2)?.sprintNumero).toBe(1);
    expect(acoesEmAbertoDaUltimaRetrospectiva(sprints, 1)).toBeNull();
  });

  it('retrospectiva sem ações em aberto devolve lista vazia, não null', () => {
    const resultado = acoesEmAbertoDaUltimaRetrospectiva([
      comRetro(1, [{ descricao: 'x', concluida: true }]),
    ]);
    expect(resultado).toEqual({ sprintNumero: 1, acoes: [] });
  });
});
