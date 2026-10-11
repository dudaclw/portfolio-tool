import { describe, expect, it } from 'vitest';
import { criarItem, type ItemBacklog } from '../backlog/item-backlog';
import { ErroDeRegra } from '../compartilhado/erro-de-regra';
import { ErroDeValidacao } from '../compartilhado/erro-de-validacao';
import { registrarReview } from './review';
import { criarSprint, type Sprint } from './sprint';

const item = (id: string, estado: ItemBacklog['estado']): ItemBacklog => ({
  ...criarItem(id, 'p1', { titulo: `Item ${id}`, estimativa: 5 }, 1),
  estado,
  sprintId: 's1',
});

const sprint = (parcial: Partial<Sprint> = {}): Sprint => ({
  ...criarSprint('s1', 'p1', 1, '2026-09-29', 15),
  meta: 'M',
  situacao: 'ativa',
  itens: ['a', 'b'].map((itemId) => ({
    itemId,
    estimativaPlanejada: 5,
    adicionadoEm: '2026-09-29T09:00:00Z',
    resultado: null,
  })),
  ...parcial,
});

const itens = [item('a', 'concluido'), item('b', 'em_andamento')];

function falha(acao: () => unknown): unknown {
  try {
    acao();
  } catch (e) {
    return e;
  }
}

describe('registrarReview', () => {
  it('guarda resultado e feedback por item, e deixa os não citados como estavam', () => {
    const depois = registrarReview(sprint(), itens, [
      { itemId: 'a', resultado: 'aceito', feedback: ' Ficou ótimo ' },
    ]);
    expect(depois.itens[0]).toMatchObject({ resultado: 'aceito', feedbackReview: 'Ficou ótimo' });
    expect(depois.itens[1]?.resultado).toBeNull();
  });

  it('item não aceito pode estar em qualquer estado', () => {
    const depois = registrarReview(sprint(), itens, [{ itemId: 'b', resultado: 'nao_aceito' }]);
    expect(depois.itens[1]?.resultado).toBe('nao_aceito');
  });

  it('aceitar item que não está concluído é recusado', () => {
    const erro = falha(() =>
      registrarReview(sprint(), itens, [{ itemId: 'b', resultado: 'aceito' }]),
    );
    expect(erro).toBeInstanceOf(ErroDeRegra);
    expect((erro as ErroDeRegra).codigo).toBe('ITEM-NAO-CONCLUIDO');
  });

  it('null desfaz o resultado e apaga o feedback anterior', () => {
    const primeiro = registrarReview(sprint(), itens, [
      { itemId: 'a', resultado: 'aceito', feedback: 'ok' },
    ]);
    const desfeito = registrarReview(primeiro, itens, [{ itemId: 'a', resultado: null }]);
    expect(desfeito.itens[0]).toEqual(expect.objectContaining({ resultado: null }));
    expect(desfeito.itens[0]).not.toHaveProperty('feedbackReview');
  });

  it('só com a sprint ativa', () => {
    for (const situacao of ['planejada', 'encerrada'] as const) {
      const erro = falha(() => registrarReview(sprint({ situacao }), itens, []));
      expect((erro as ErroDeRegra).codigo).toBe('SPRINT-NAO-ATIVA');
    }
  });

  it('item que não é da sprint é validação (422)', () => {
    expect(
      falha(() => registrarReview(sprint(), itens, [{ itemId: 'x', resultado: null }])),
    ).toBeInstanceOf(ErroDeValidacao);
  });
});
