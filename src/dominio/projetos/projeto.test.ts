import { describe, expect, it } from 'vitest';
import { ErroDeValidacao } from '../compartilhado/erro-de-validacao';
import {
  DEFINICAO_DE_PRONTO_PADRAO,
  alterarProjeto,
  criarProjeto,
  type EntradaDeProjeto,
} from './projeto';

const entradaValida: EntradaDeProjeto = {
  nome: 'Portal do Cliente',
  objetivo: 'Cliente acompanha seus chamados',
  inicio: '2026-09-14',
  fimPrevisto: '2026-12-18',
};

function camposComErro(acao: () => unknown): string[] {
  try {
    acao();
  } catch (erro) {
    if (erro instanceof ErroDeValidacao) return erro.campos.map((c) => c.campo);
    throw erro;
  }
  return [];
}

describe('criarProjeto', () => {
  it('aplica os padrões: planejado, sprint de 15 dias e Definição de Pronto padrão', () => {
    const projeto = criarProjeto('p1', entradaValida);
    expect(projeto).toEqual({
      id: 'p1',
      nome: 'Portal do Cliente',
      objetivo: 'Cliente acompanha seus chamados',
      inicio: '2026-09-14',
      fimPrevisto: '2026-12-18',
      status: 'planejado',
      duracaoSprintDias: 15,
      definicaoDePronto: [...DEFINICAO_DE_PRONTO_PADRAO],
    });
  });

  it('a Definição de Pronto padrão tem os quatro critérios do escopo', () => {
    expect(DEFINICAO_DE_PRONTO_PADRAO).toEqual([
      'Critérios de aceite atendidos',
      'Testado',
      'Revisado por outra pessoa',
      'Documentação atualizada quando aplicável',
    ]);
  });

  it('aceita fim previsto igual ao início', () => {
    expect(() =>
      criarProjeto('p1', { ...entradaValida, inicio: '2026-09-14', fimPrevisto: '2026-09-14' }),
    ).not.toThrow();
  });

  it('recusa fim previsto anterior ao início', () => {
    const campos = camposComErro(() =>
      criarProjeto('p1', { ...entradaValida, inicio: '2026-12-18', fimPrevisto: '2026-09-14' }),
    );
    expect(campos).toEqual(['fimPrevisto']);
  });

  it('recusa nome em branco, data inexistente e duração inválida, listando todos os campos', () => {
    const campos = camposComErro(() =>
      criarProjeto('p1', {
        ...entradaValida,
        nome: '   ',
        inicio: '2026-02-30',
        duracaoSprintDias: 0,
      }),
    );
    expect(campos).toEqual(['nome', 'inicio', 'duracaoSprintDias']);
  });

  it('recusa duração fracionária', () => {
    expect(
      camposComErro(() => criarProjeto('p1', { ...entradaValida, duracaoSprintDias: 7.5 })),
    ).toEqual(['duracaoSprintDias']);
  });

  it('apara textos, descarta critérios vazios e omite patrocinador vazio', () => {
    const projeto = criarProjeto('p1', {
      ...entradaValida,
      nome: '  Portal  ',
      patrocinador: '   ',
      definicaoDePronto: ['  Testado ', '', '   '],
    });
    expect(projeto.nome).toBe('Portal');
    expect('patrocinador' in projeto).toBe(false);
    expect(projeto.definicaoDePronto).toEqual(['Testado']);
  });
});

describe('alterarProjeto', () => {
  const original = criarProjeto('p1', { ...entradaValida, patrocinador: 'Carla' });

  it('altera apenas os campos informados e mantém o id', () => {
    const alterado = alterarProjeto(original, { status: 'em_andamento' });
    expect(alterado).toEqual({ ...original, status: 'em_andamento' });
    expect(original.status).toBe('planejado');
  });

  it('patrocinador vazio remove o campo', () => {
    expect('patrocinador' in alterarProjeto(original, { patrocinador: '' })).toBe(false);
  });

  it('revalida o período ao alterar só uma das datas', () => {
    expect(camposComErro(() => alterarProjeto(original, { fimPrevisto: '2026-01-01' }))).toEqual([
      'fimPrevisto',
    ]);
  });

  it('permite editar a Definição de Pronto', () => {
    const alterado = alterarProjeto(original, { definicaoDePronto: ['Testado', 'Publicado'] });
    expect(alterado.definicaoDePronto).toEqual(['Testado', 'Publicado']);
  });
});
