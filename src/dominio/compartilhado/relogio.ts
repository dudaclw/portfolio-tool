import type { Data, Instante } from './tipos';

/**
 * Relógio injetado: o domínio nunca lê a hora do sistema, apenas chama `agora()`.
 * O relógio real fica em infra; os testes usam `relogioFixo`.
 */
export type Relogio = () => Instante;

export function relogioFixo(instante: Instante): Relogio {
  return () => instante;
}

/** Data de calendário (UTC) de um instante: '2026-10-09T12:00:00Z' → '2026-10-09'. */
export function dataDoInstante(instante: Instante): Data {
  return instante.slice(0, 10);
}

/** "Hoje" segundo o relógio injetado. */
export function hoje(agora: Relogio): Data {
  return dataDoInstante(agora());
}
