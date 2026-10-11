import { describe, expect, it } from 'vitest';
import { criarItem, type ItemBacklog } from './item-backlog';
import { compactarOrdem, moverItem, ordenarPorOrdem, proximaOrdem } from './ordenacao';

const lista = (...ids: string[]): ItemBacklog[] =>
  ids.map((id, i) => criarItem(id, 'p1', { titulo: id }, i + 1));

/** Aplica o resultado de moverItem e devolve os ids na nova ordem. */
function aplicar(itens: ItemBacklog[], alterados: ItemBacklog[]): string[] {
  const porId = new Map(alterados.map((item) => [item.id, item]));
  return ordenarPorOrdem(itens.map((item) => porId.get(item.id) ?? item)).map((item) => item.id);
}

const posicoes = (itens: ItemBacklog[], alterados: ItemBacklog[]) => {
  const porId = new Map(alterados.map((item) => [item.id, item]));
  return itens.map((item) => (porId.get(item.id) ?? item).ordem).sort((a, b) => a - b);
};

describe('proximaOrdem', () => {
  it('é 1 em lista vazia e N+1 caso contrário', () => {
    expect(proximaOrdem([])).toBe(1);
    expect(proximaOrdem(lista('a', 'b', 'c'))).toBe(4);
  });
});

describe('moverItem', () => {
  it('sobe e desce trocando com o vizinho', () => {
    const itens = lista('a', 'b', 'c');
    expect(aplicar(itens, moverItem(itens, 'b', 'acima'))).toEqual(['b', 'a', 'c']);
    expect(aplicar(itens, moverItem(itens, 'b', 'abaixo'))).toEqual(['a', 'c', 'b']);
  });

  it('as posições continuam de 1 a N, sem lacunas nem repetição', () => {
    const itens = lista('a', 'b', 'c', 'd', 'e');
    for (const id of ['a', 'c', 'e']) {
      for (const direcao of ['acima', 'abaixo'] as const) {
        expect(posicoes(itens, moverItem(itens, id, direcao))).toEqual([1, 2, 3, 4, 5]);
      }
    }
  });

  it('na ponta não há vizinho: nada muda', () => {
    const itens = lista('a', 'b');
    expect(moverItem(itens, 'a', 'acima')).toEqual([]);
    expect(moverItem(itens, 'b', 'abaixo')).toEqual([]);
  });

  it('devolve só os dois itens trocados e não altera os recebidos', () => {
    const itens = lista('a', 'b', 'c');
    const alterados = moverItem(itens, 'c', 'acima');
    expect(alterados.map((i) => i.id).sort()).toEqual(['b', 'c']);
    expect(itens.map((i) => i.ordem)).toEqual([1, 2, 3]);
  });

  it('item de sprint não troca com item do backlog (o vizinho é do mesmo grupo)', () => {
    // posições: a(backlog) 1, s1(sprint) 2, b(backlog) 3
    const itens = lista('a', 's1', 'b');
    itens[1] = { ...itens[1]!, sprintId: 'sp1' };
    const alterados = moverItem(itens, 'b', 'acima');
    // b troca com a (vizinho do backlog), pulando s1
    expect(aplicar(itens, alterados)).toEqual(['b', 's1', 'a']);
    expect(posicoes(itens, alterados)).toEqual([1, 2, 3]);
    expect(moverItem(itens, 's1', 'acima')).toEqual([]);
  });

  it('item inexistente é erro de programação', () => {
    expect(() => moverItem(lista('a'), 'x', 'acima')).toThrow();
  });
});

describe('compactarOrdem', () => {
  it('renumera de 1 a N mantendo a ordem relativa e devolve só o que mudou', () => {
    const itens = lista('a', 'b', 'c', 'd');
    const semB = itens.filter((i) => i.id !== 'b');
    const alterados = compactarOrdem(semB);
    expect(alterados.map((i) => [i.id, i.ordem])).toEqual([
      ['c', 2],
      ['d', 3],
    ]);
    expect(posicoes(semB, alterados)).toEqual([1, 2, 3]);
  });

  it('lista já compacta não muda', () => {
    expect(compactarOrdem(lista('a', 'b'))).toEqual([]);
  });
});
