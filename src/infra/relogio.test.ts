import { describe, expect, it } from 'vitest';
import { criarRelogio } from './relogio';

describe('criarRelogio', () => {
  it('usa RELOGIO_FIXO quando definido', () => {
    const agora = criarRelogio({ RELOGIO_FIXO: '2026-10-09T12:00:00Z' });
    expect(agora()).toBe('2026-10-09T12:00:00Z');
  });

  it('recusa RELOGIO_FIXO inválido', () => {
    expect(() => criarRelogio({ RELOGIO_FIXO: 'ontem' })).toThrow(/RELOGIO_FIXO inválido/);
  });

  it('sem variável, devolve um instante ISO 8601 em UTC', () => {
    const instante = criarRelogio({})();
    expect(instante).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
