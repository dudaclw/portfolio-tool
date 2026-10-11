import { describe, expect, it } from 'vitest';
import { ErroDeRegra } from '../compartilhado/erro-de-regra';
import { ErroDeValidacao } from '../compartilhado/erro-de-validacao';
import { criarItem, marcarCriterios, type ItemBacklog } from './item-backlog';
import { transicionarItem } from './transicao';

const AGORA = '2026-10-09T12:00:00Z';
const DOD = [
  'Critérios de aceite atendidos',
  'Testado',
  'Revisado por outra pessoa',
  'Documentação atualizada quando aplicável',
];

const item = (): ItemBacklog => criarItem('i1', 'p1', { titulo: 'Abrir chamado' }, 1);

describe('transicionarItem', () => {
  it('muda o estado e devolve o registro de histórico com de, para e instante', () => {
    const { item: depois, registro } = transicionarItem(item(), 'refinado', DOD, AGORA);
    expect(depois.estado).toBe('refinado');
    expect(registro).toEqual({ itemId: 'i1', de: 'novo', para: 'refinado', em: AGORA });
  });

  it('não altera o item recebido', () => {
    const original = item();
    transicionarItem(original, 'refinado', DOD, AGORA);
    expect(original.estado).toBe('novo');
  });

  it('RN-04: item com 3 de 4 critérios marcados não vai a concluido', () => {
    const parcial = marcarCriterios(item(), DOD.slice(0, 3), DOD);
    let erro: unknown;
    try {
      transicionarItem(parcial, 'concluido', DOD, AGORA);
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(ErroDeRegra);
    expect((erro as ErroDeRegra).codigo).toBe('RN-04');
    expect((erro as ErroDeRegra).mensagem).toContain('Documentação atualizada quando aplicável');
  });

  it('RN-04: com os 4 critérios marcados vai a concluido', () => {
    const completo = marcarCriterios(item(), DOD, DOD);
    expect(transicionarItem(completo, 'concluido', DOD, AGORA).item.estado).toBe('concluido');
  });

  it('RN-04: com Definição de Pronto vazia, concluir é permitido', () => {
    expect(transicionarItem(item(), 'concluido', [], AGORA).item.estado).toBe('concluido');
  });

  it('RN-04 só vale para concluido: os outros estados não pedem critérios', () => {
    for (const para of ['refinado', 'pronto_para_sprint', 'em_andamento', 'em_revisao'] as const) {
      expect(transicionarItem(item(), para, DOD, AGORA).item.estado).toBe(para);
    }
  });

  it('um critério marcado que saiu da Definição do projeto não conta como cumprido', () => {
    const marcado = { ...item(), dodMarcados: ['Testado', 'Critério antigo'] };
    expect(() =>
      transicionarItem(marcado, 'concluido', ['Testado', 'Novo critério'], AGORA),
    ).toThrow(ErroDeRegra);
  });

  it('recusa o mesmo estado e estado desconhecido (validação, não regra)', () => {
    expect(() => transicionarItem(item(), 'novo', DOD, AGORA)).toThrow(ErroDeValidacao);
    expect(() => transicionarItem(item(), 'voando' as never, DOD, AGORA)).toThrow(ErroDeValidacao);
  });
});
