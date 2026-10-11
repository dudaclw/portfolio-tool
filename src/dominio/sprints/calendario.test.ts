import { describe, expect, it } from 'vitest';
import { calcularFimDaSprint, diasUteisRestantes, inicioPadraoDaSprint } from './calendario';

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

describe('inicioPadraoDaSprint', () => {
  it('a primeira sprint começa no início do projeto', () => {
    expect(inicioPadraoDaSprint('2026-09-14', null)).toBe('2026-09-14');
  });

  it('as seguintes começam no dia seguinte ao fim da anterior', () => {
    expect(inicioPadraoDaSprint('2026-09-14', '2026-09-28')).toBe('2026-09-29');
    expect(inicioPadraoDaSprint('2026-09-14', '2026-10-13')).toBe('2026-10-14');
  });
});

describe('diasUteisRestantes', () => {
  const sprint2 = { inicio: '2026-09-29', fim: '2026-10-13' };
  const feriados = ['2026-10-12'];

  it('em 2026-10-09 faltam 2 dias úteis: 09/10 e 13/10 (12/10 é feriado)', () => {
    expect(diasUteisRestantes(sprint2, '2026-10-09', feriados)).toBe(2);
  });

  it('conta o dia de hoje quando ele é útil, e não conta quando é fim de semana', () => {
    expect(diasUteisRestantes(sprint2, '2026-10-13', feriados)).toBe(1);
    expect(diasUteisRestantes(sprint2, '2026-10-10', feriados)).toBe(1); // sábado
  });

  it('sem feriados, 12/10 conta', () => {
    expect(diasUteisRestantes(sprint2, '2026-10-09')).toBe(3);
  });

  it('antes do início conta a sprint inteira; depois do fim, zero', () => {
    expect(diasUteisRestantes(sprint2, '2026-09-01', feriados)).toBe(10);
    expect(diasUteisRestantes(sprint2, '2026-10-14', feriados)).toBe(0);
  });
});
