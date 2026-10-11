import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PORTA_DO_E2E } from '../playwright.config';

/**
 * Servidor do roteiro de aceite: compila o app numa pasta própria (`.next-e2e`), grava uma cópia
 * dos dados de exemplo num arquivo temporário e sobe `next start` na porta 3100, com "hoje"
 * fixo. Os dados de quem usa o app (`data/dados.json`) não são tocados.
 */
const RELOGIO_FIXO = '2026-10-09T12:00:00Z';
const RAIZ = join(__dirname, '..');

let pastaDosDados: string | null = null;
let servidor: ChildProcess | null = null;

function ambiente(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: '1',
    NEXT_DIST_DIR: '.next-e2e',
    ARQUIVO_DE_DADOS: join(pastaDosDados!, 'dados.json'),
    RELOGIO_FIXO,
  };
}

function executar(comando: string, argumentos: string[]) {
  const resultado = spawnSync(comando, argumentos, {
    cwd: RAIZ,
    env: ambiente(),
    encoding: 'utf8',
  });
  if (resultado.status !== 0) {
    throw new Error(
      `Falhou: ${comando} ${argumentos.join(' ')}\n${resultado.stdout}\n${resultado.stderr}`,
    );
  }
}

async function esperarNoAr(): Promise<void> {
  const limite = Date.now() + 60_000;
  while (Date.now() < limite) {
    try {
      const resposta = await fetch(`http://127.0.0.1:${PORTA_DO_E2E}/api/v1/saude`);
      if (resposta.ok) return;
    } catch {
      // ainda subindo
    }
    await new Promise((resolver) => setTimeout(resolver, 300));
  }
  throw new Error('O servidor do roteiro de aceite não subiu em 60 s.');
}

/** Compila, grava a cópia dos dados de exemplo e sobe o servidor. */
export async function prepararEIniciar(): Promise<void> {
  pastaDosDados = mkdtempSync(join(tmpdir(), 'portfolio-e2e-'));
  executar('npx', ['next', 'build']);
  executar('npx', ['tsx', 'scripts/seed.ts']);
  await iniciar();
}

export async function iniciar(): Promise<void> {
  servidor = spawn('npx', ['next', 'start', '-H', '127.0.0.1', '-p', String(PORTA_DO_E2E)], {
    cwd: RAIZ,
    env: ambiente(),
    stdio: 'ignore',
    detached: true,
  });
  await esperarNoAr();
}

export async function parar(): Promise<void> {
  const processo = servidor;
  servidor = null;
  if (!processo?.pid) return;
  // O processo roda em grupo próprio (detached): derrubar o grupo leva o `next` junto com o `npx`.
  try {
    process.kill(-processo.pid, 'SIGTERM');
  } catch {
    // já tinha terminado
  }
  const limite = Date.now() + 10_000;
  while (Date.now() < limite) {
    try {
      await fetch(`http://127.0.0.1:${PORTA_DO_E2E}/api/v1/saude`);
    } catch {
      return; // não responde mais
    }
    await new Promise((resolver) => setTimeout(resolver, 200));
  }
}

/** Reinicia o processo mantendo o arquivo de dados (passo 11). */
export async function reiniciar(): Promise<void> {
  await parar();
  await iniciar();
}

export async function encerrar(): Promise<void> {
  await parar();
  if (pastaDosDados) rmSync(pastaDosDados, { recursive: true, force: true });
  pastaDosDados = null;
}
