import { defineConfig } from '@playwright/test';

/**
 * Roteiro de aceite do MVP (agent.md, seção 9). O servidor é iniciado pelo próprio roteiro
 * (e2e/servidor.ts), sobre uma cópia dos dados de exemplo e com "hoje" fixo em 2026-10-09,
 * porque o passo 11 precisa reiniciá-lo. Usa o Google Chrome instalado: nada é baixado.
 */
export const PORTA_DO_E2E = 3100;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORTA_DO_E2E}`,
    channel: 'chrome',
    headless: true,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
