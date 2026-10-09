import { describe, expect, it } from 'vitest';
import {
  compararDatas,
  diaDaSemana,
  diasEntre,
  diasUteis,
  ehDataValida,
  ehFimDeSemana,
  intervalo,
  pascoa,
  sextaFeiraSanta,
  somarDias,
} from './datas';

describe('somarDias', () => {
  it('soma dias corridos dentro do mês', () => {
    expect(somarDias('2026-10-19', 14)).toBe('2026-11-02');
  });

  it('atravessa mudança de ano', () => {
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(somarDias('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('respeita ano bissexto', () => {
    expect(somarDias('2028-02-28', 1)).toBe('2028-02-29');
    expect(somarDias('2027-02-28', 1)).toBe('2027-03-01');
    expect(somarDias('2100-02-28', 1)).toBe('2100-03-01');
  });

  it('aceita zero e valores negativos', () => {
    expect(somarDias('2026-10-09', 0)).toBe('2026-10-09');
    expect(somarDias('2026-10-09', -9)).toBe('2026-09-30');
  });
});

describe('diasEntre e compararDatas', () => {
  it('conta dias corridos', () => {
    expect(diasEntre('2026-10-19', '2026-11-02')).toBe(14);
    expect(diasEntre('2026-11-02', '2026-10-19')).toBe(-14);
  });

  it('compara datas', () => {
    expect(compararDatas('2026-10-19', '2026-11-02')).toBeLessThan(0);
    expect(compararDatas('2026-11-02', '2026-10-19')).toBeGreaterThan(0);
    expect(compararDatas('2026-11-02', '2026-11-02')).toBe(0);
  });
});

describe('diaDaSemana', () => {
  it('devolve 0 para domingo e 6 para sábado', () => {
    expect(diaDaSemana('2026-10-18')).toBe(0); // domingo
    expect(diaDaSemana('2026-10-19')).toBe(1); // segunda-feira
    expect(diaDaSemana('2026-11-02')).toBe(1); // segunda-feira
    expect(diaDaSemana('2026-10-24')).toBe(6); // sábado
    expect(diaDaSemana('1970-01-01')).toBe(4); // quinta-feira
  });

  it('identifica fim de semana', () => {
    expect(ehFimDeSemana('2026-10-24')).toBe(true);
    expect(ehFimDeSemana('2026-10-25')).toBe(true);
    expect(ehFimDeSemana('2026-10-26')).toBe(false);
  });
});

describe('ehDataValida', () => {
  it('aceita datas reais e recusa o resto', () => {
    expect(ehDataValida('2026-10-09')).toBe(true);
    expect(ehDataValida('2028-02-29')).toBe(true);
    expect(ehDataValida('2027-02-29')).toBe(false);
    expect(ehDataValida('2026-13-01')).toBe(false);
    expect(ehDataValida('09/10/2026')).toBe(false);
    expect(ehDataValida('2026-10-09T12:00:00Z')).toBe(false);
  });

  it('lança erro claro ao operar com data inválida', () => {
    expect(() => somarDias('2027-02-30', 1)).toThrow(RangeError);
  });
});

describe('intervalo', () => {
  it('inclui as duas pontas', () => {
    expect(intervalo('2026-10-30', '2026-11-02')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
  });

  it('é vazio quando o fim vem antes do início', () => {
    expect(intervalo('2026-11-02', '2026-10-30')).toEqual([]);
  });
});

describe('diasUteis', () => {
  it('de 2026-10-19 a 2026-11-02 com feriado em 2026-11-02 há 10 dias úteis', () => {
    const uteis = diasUteis('2026-10-19', '2026-11-02', ['2026-11-02']);
    expect(uteis).toHaveLength(10);
    expect(uteis[0]).toBe('2026-10-19');
    expect(uteis.at(-1)).toBe('2026-10-30');
  });

  it('sem o feriado, o mesmo intervalo tem 11 dias úteis', () => {
    expect(diasUteis('2026-10-19', '2026-11-02')).toHaveLength(11);
  });

  it('desconta feriado que cai em dia de semana (12/10, segunda-feira)', () => {
    // Sprint 2 dos dados de exemplo: 29/09 a 13/10, com 12/10 feriado.
    const uteis = diasUteis('2026-09-29', '2026-10-13', ['2026-10-12']);
    expect(uteis).toContain('2026-10-09');
    expect(uteis).toContain('2026-10-13');
    expect(uteis).not.toContain('2026-10-12');
    expect(uteis).toHaveLength(10);
  });

  it('não conta feriado em fim de semana duas vezes', () => {
    expect(diasUteis('2026-10-24', '2026-10-25', ['2026-10-24'])).toEqual([]);
  });
});

describe('Páscoa e Sexta-feira Santa', () => {
  it('Sexta-feira Santa de 2026 é 2026-04-03', () => {
    expect(sextaFeiraSanta(2026)).toBe('2026-04-03');
  });

  it('Sexta-feira Santa de 2027 é 2027-03-26', () => {
    expect(sextaFeiraSanta(2027)).toBe('2027-03-26');
  });

  it('calcula a Páscoa de anos conhecidos', () => {
    expect(pascoa(2026)).toBe('2026-04-05');
    expect(pascoa(2027)).toBe('2027-03-28');
    expect(pascoa(2024)).toBe('2024-03-31');
    expect(pascoa(2025)).toBe('2025-04-20');
  });

  it('a Sexta-feira Santa cai sempre numa sexta-feira', () => {
    for (let ano = 2020; ano <= 2040; ano++) {
      expect(diaDaSemana(sextaFeiraSanta(ano))).toBe(5);
    }
  });
});
