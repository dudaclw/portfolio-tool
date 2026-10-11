import { describe, expect, it } from 'vitest';
import { feriadosNacionais } from './feriados';

describe('feriadosNacionais', () => {
  it('traz os 10 feriados do ano em ordem de data, com a Sexta-feira Santa de cada ano', () => {
    const de2026 = feriadosNacionais(2026);
    expect(de2026).toHaveLength(10);
    expect(de2026.map((f) => f.data)).toEqual([
      '2026-01-01',
      '2026-04-03',
      '2026-04-21',
      '2026-05-01',
      '2026-09-07',
      '2026-10-12',
      '2026-11-02',
      '2026-11-15',
      '2026-11-20',
      '2026-12-25',
    ]);
    expect(feriadosNacionais(2027).find((f) => f.nome === 'Sexta-feira Santa')?.data).toBe(
      '2027-03-26',
    );
  });
});
