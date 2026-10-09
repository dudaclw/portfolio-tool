import { describe, expect, it } from 'vitest';
import { dataDoInstante, hoje, relogioFixo } from './relogio';

describe('relógio injetado', () => {
  it('relogioFixo devolve sempre o mesmo instante', () => {
    const agora = relogioFixo('2026-10-09T12:00:00Z');
    expect(agora()).toBe('2026-10-09T12:00:00Z');
    expect(agora()).toBe('2026-10-09T12:00:00Z');
  });

  it('extrai a data de calendário do instante', () => {
    expect(dataDoInstante('2026-10-09T12:00:00Z')).toBe('2026-10-09');
  });

  it('hoje usa o relógio recebido', () => {
    expect(hoje(relogioFixo('2026-10-09T12:00:00Z'))).toBe('2026-10-09');
  });
});
