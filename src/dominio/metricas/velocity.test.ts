import { describe, expect, it } from 'vitest';
import { passaDaVelocityMedia, velocityMedia } from './velocity';

const encerrada = (numero: number, velocity: number | null) => ({
  numero,
  situacao: 'encerrada' as const,
  velocity,
});

describe('velocityMedia', () => {
  it('sem sprint encerrada não há dado', () => {
    expect(velocityMedia([])).toBeNull();
    expect(velocityMedia([{ numero: 1, situacao: 'ativa', velocity: null }])).toBeNull();
  });

  it('com menos de 3 usa as disponíveis: (13 + 16) ÷ 2 = 14,5', () => {
    expect(velocityMedia([encerrada(1, 13), encerrada(2, 16)])).toBe(14.5);
  });

  it('usa só as 3 últimas encerradas', () => {
    const sprints = [encerrada(1, 100), encerrada(2, 10), encerrada(3, 13), encerrada(4, 16)];
    expect(velocityMedia(sprints)).toBe(13);
  });

  it('ignora sprints ativas e planejadas', () => {
    const sprints = [
      encerrada(1, 13),
      { numero: 2, situacao: 'ativa' as const, velocity: null },
      { numero: 3, situacao: 'planejada' as const, velocity: null },
    ];
    expect(velocityMedia(sprints)).toBe(13);
  });
});

describe('passaDaVelocityMedia', () => {
  it('avisa só quando os pontos passam da média', () => {
    expect(passaDaVelocityMedia(15, 14.5)).toBe(true);
    expect(passaDaVelocityMedia(14.5, 14.5)).toBe(false);
    expect(passaDaVelocityMedia(8, 14.5)).toBe(false);
  });

  it('sem média não há aviso', () => {
    expect(passaDaVelocityMedia(100, null)).toBe(false);
  });
});
