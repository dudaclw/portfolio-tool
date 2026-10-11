import { describe, expect, it } from 'vitest';
import { ErroDeValidacao } from '../compartilhado/erro-de-validacao';
import {
  alterarItem,
  criarItem,
  impedirItem,
  liberarItem,
  marcarCriterios,
  type ItemBacklog,
} from './item-backlog';

function camposComErro(acao: () => unknown): string[] {
  try {
    acao();
  } catch (erro) {
    if (erro instanceof ErroDeValidacao) return erro.campos.map((c) => c.campo);
    throw erro;
  }
  return [];
}

const DOD = ['Critérios de aceite atendidos', 'Testado', 'Revisado por outra pessoa'];

const novo = (): ItemBacklog => criarItem('i1', 'p1', { titulo: 'Abrir chamado' }, 1);

describe('criarItem', () => {
  it('cria história nova, fora de sprint, sem estimativa e sem impedimento', () => {
    expect(novo()).toEqual({
      id: 'i1',
      projetoId: 'p1',
      tipo: 'historia',
      titulo: 'Abrir chamado',
      descricao: '',
      criteriosAceite: '',
      estimativa: null,
      ordem: 1,
      estado: 'novo',
      responsavelId: null,
      impedido: null,
      dodMarcados: [],
      sprintId: null,
    });
  });

  it('aceita cada valor da escala de estimativa', () => {
    for (const estimativa of [1, 2, 3, 5, 8, 13, 21]) {
      expect(criarItem('i', 'p', { titulo: 'x', estimativa }, 1).estimativa).toBe(estimativa);
    }
  });

  it.each([4, 0, 6, 22, -1, 2.5])('recusa a estimativa %s (fora da escala)', (estimativa) => {
    expect(camposComErro(() => criarItem('i', 'p', { titulo: 'x', estimativa }, 1))).toEqual([
      'estimativa',
    ]);
  });

  it('recusa título em branco e tipo desconhecido, listando os dois campos', () => {
    const campos = camposComErro(() =>
      criarItem('i', 'p', { titulo: '   ', tipo: 'epico' as never }, 1),
    );
    expect(campos).toEqual(['titulo', 'tipo']);
  });

  it('apara os espaços dos textos', () => {
    const item = criarItem('i', 'p', { titulo: '  Login  ', descricao: ' d ' }, 1);
    expect(item.titulo).toBe('Login');
    expect(item.descricao).toBe('d');
  });
});

describe('alterarItem', () => {
  it('muda só os campos informados', () => {
    const editado = alterarItem(novo(), { titulo: 'Novo título', estimativa: 5 });
    expect(editado).toMatchObject({ titulo: 'Novo título', estimativa: 5, tipo: 'historia' });
  });

  it('null limpa estimativa e responsável; ausente mantém', () => {
    const com = alterarItem(novo(), { estimativa: 8, responsavelId: 'ana' });
    expect(alterarItem(com, { titulo: 'x' })).toMatchObject({
      estimativa: 8,
      responsavelId: 'ana',
    });
    expect(alterarItem(com, { estimativa: null, responsavelId: null })).toMatchObject({
      estimativa: null,
      responsavelId: null,
    });
  });

  it('revalida: estimativa 4 e título vazio são recusados, e o original não muda', () => {
    const original = novo();
    expect(camposComErro(() => alterarItem(original, { estimativa: 4 }))).toEqual(['estimativa']);
    expect(camposComErro(() => alterarItem(original, { titulo: '' }))).toEqual(['titulo']);
    expect(original.estimativa).toBeNull();
  });

  it('não mexe em estado, ordem, impedimento nem Definição de Pronto', () => {
    const item = { ...novo(), estado: 'refinado' as const, ordem: 7, dodMarcados: ['Testado'] };
    const editado = alterarItem(item, { titulo: 'Outro' });
    expect(editado).toMatchObject({ estado: 'refinado', ordem: 7, dodMarcados: ['Testado'] });
  });
});

describe('impedimento', () => {
  it('marca com motivo e instante, e libera', () => {
    const impedido = impedirItem(novo(), ' Aguardando API ', '2026-10-09T12:00:00Z');
    expect(impedido.impedido).toEqual({
      motivo: 'Aguardando API',
      desde: '2026-10-09T12:00:00Z',
    });
    expect(liberarItem(impedido).impedido).toBeNull();
  });

  it('exige motivo', () => {
    expect(camposComErro(() => impedirItem(novo(), '  ', '2026-10-09T12:00:00Z'))).toEqual([
      'motivo',
    ]);
  });

  it('marcar de novo atualiza o motivo e mantém o "desde" original', () => {
    const primeiro = impedirItem(novo(), 'A', '2026-10-01T09:00:00Z');
    const segundo = impedirItem(primeiro, 'B', '2026-10-09T12:00:00Z');
    expect(segundo.impedido).toEqual({ motivo: 'B', desde: '2026-10-01T09:00:00Z' });
  });
});

describe('marcarCriterios', () => {
  it('guarda os marcados na ordem da Definição de Pronto, sem repetir', () => {
    const item = marcarCriterios(novo(), ['Testado', 'Testado', DOD[0]!], DOD);
    expect(item.dodMarcados).toEqual([DOD[0], 'Testado']);
  });

  it('lista vazia desmarca tudo', () => {
    const marcado = marcarCriterios(novo(), DOD, DOD);
    expect(marcarCriterios(marcado, [], DOD).dodMarcados).toEqual([]);
  });

  it('recusa critério que não está na Definição de Pronto do projeto', () => {
    expect(camposComErro(() => marcarCriterios(novo(), ['Inventado'], DOD))).toEqual(['marcados']);
  });
});
