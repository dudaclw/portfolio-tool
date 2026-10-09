import { describe, expect, it } from 'vitest';
import { calcularFimDaSprint } from './calendario';

describe('calcularFimDaSprint', () => {
  it('início 2026-10-19 com duração 15 termina em 2026-11-02', () => {
    expect(calcularFimDaSprint('2026-10-19', 15)).toBe('2026-11-02');
  });

  it('sprint de 1 dia começa e termina no mesmo dia', () => {
    expect(calcularFimDaSprint('2026-10-19', 1)).toBe('2026-10-19');
  });

  it('bate com as sprints dos dados de exemplo', () => {
    expect(calcularFimDaSprint('2026-09-14', 15)).toBe('2026-09-28');
    expect(calcularFimDaSprint('2026-09-29', 15)).toBe('2026-10-13');
    expect(calcularFimDaSprint('2026-10-14', 15)).toBe('2026-10-28');
  });
});
