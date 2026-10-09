import type { Relogio } from '@/dominio/compartilhado/relogio';

/**
 * Relógio real do app. Com RELOGIO_FIXO definido (ISO 8601 em UTC), "agora" fica congelado,
 * o que torna testes de aceite e demonstrações determinísticos.
 */
export function criarRelogio(ambiente: Record<string, string | undefined> = process.env): Relogio {
  const fixo = ambiente.RELOGIO_FIXO?.trim();
  if (fixo) {
    if (Number.isNaN(Date.parse(fixo))) {
      throw new Error(
        `RELOGIO_FIXO inválido: "${fixo}". Use ISO 8601, por exemplo 2026-10-09T12:00:00Z.`,
      );
    }
    return () => fixo;
  }
  return () => new Date().toISOString();
}
