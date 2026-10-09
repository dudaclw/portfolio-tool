import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

/*
 * Prova a regra de dependência entre camadas (agent.md, regra 4): roda o ESLint do projeto
 * sobre trechos de código fictícios e confere que as violações são barradas.
 */

const eslint = new ESLint({ cwd: process.cwd() });

const REGRAS_DE_FRONTEIRA = ['no-restricted-imports', 'no-restricted-syntax'];

async function violacoes(caminho: string, codigo: string): Promise<string[]> {
  const [resultado] = await eslint.lintText(codigo, { filePath: caminho });
  return (resultado?.messages ?? [])
    .filter((m) => m.ruleId !== null && REGRAS_DE_FRONTEIRA.includes(m.ruleId))
    .map((m) => m.message);
}

describe('fronteira: dominio', () => {
  const arquivo = 'src/dominio/projetos/exemplo.ts';

  it.each([
    ["import React from 'react';", 'react'],
    ["import { useState } from 'react';", 'react (nomeado)'],
    ["import Link from 'next/link';", 'next'],
    ["import { readFileSync } from 'node:fs';", 'node:fs'],
    ["import { readFileSync } from 'fs';", 'fs'],
    ["import { z } from 'zod';", 'biblioteca externa'],
    ["import { x } from '../../aplicacao/caso-de-uso';", 'aplicacao (relativo)'],
    ["import { x } from '@/aplicacao/caso-de-uso';", 'aplicacao (alias)'],
    ["import { x } from '@/infra/container';", 'infra'],
    ["import { x } from '@/componentes/Botao';", 'componentes'],
  ])('barra %s (%s)', async (codigo) => {
    expect(await violacoes(arquivo, `${codigo}\nexport const y = 1;\n`)).not.toHaveLength(0);
  });

  it('barra new Date() e Date.now()', async () => {
    expect(await violacoes(arquivo, 'export const a = new Date();\n')).not.toHaveLength(0);
    expect(await violacoes(arquivo, 'export const b = Date.now();\n')).not.toHaveLength(0);
  });

  it('permite imports relativos, do próprio dominio e vitest', async () => {
    const codigo = [
      "import { somarDias } from '../compartilhado/datas';",
      "import type { Data } from '@/dominio/compartilhado/tipos';",
      "import { it } from 'vitest';",
      'export const y = [somarDias, it] as unknown as Data;',
      '',
    ].join('\n');
    expect(await violacoes(arquivo, codigo)).toEqual([]);
  });
});

describe('fronteira: aplicacao', () => {
  const arquivo = 'src/aplicacao/exemplo.ts';

  it('barra infra, interface e frameworks', async () => {
    for (const origem of [
      '@/infra/container',
      '../infra/memoria/repo',
      '@/app/page',
      'react',
      'node:fs',
    ]) {
      expect(
        await violacoes(arquivo, `import { x } from '${origem}';\nexport const y = x;\n`),
      ).not.toHaveLength(0);
    }
  });

  it('permite dominio e a própria aplicacao', async () => {
    const codigo = [
      "import { ErroDeRegra } from '@/dominio/compartilhado/erro-de-regra';",
      "import { x } from './outro';",
      'export const y = [ErroDeRegra, x];',
      '',
    ].join('\n');
    expect(await violacoes(arquivo, codigo)).toEqual([]);
  });
});

describe('fronteira: infra', () => {
  const arquivo = 'src/infra/exemplo.ts';

  it('barra interface e React', async () => {
    for (const origem of ['@/app/page', '@/componentes/Botao', 'react', 'next/server']) {
      expect(
        await violacoes(arquivo, `import { x } from '${origem}';\nexport const y = x;\n`),
      ).not.toHaveLength(0);
    }
  });

  it('permite aplicacao, dominio e módulos do Node', async () => {
    const codigo = [
      "import { x } from '@/aplicacao/portas';",
      "import { y } from '@/dominio/compartilhado/datas';",
      "import { readFile } from 'node:fs/promises';",
      'export const z = [x, y, readFile];',
      '',
    ].join('\n');
    expect(await violacoes(arquivo, codigo)).toEqual([]);
  });
});

describe('fronteira: interface', () => {
  it('rotas da API usam o container, não os repositórios concretos', async () => {
    const rota = 'src/app/api/v1/exemplo/route.ts';
    expect(
      await violacoes(rota, "import { c } from '@/infra/container';\nexport const y = c;\n"),
    ).toEqual([]);
    expect(
      await violacoes(
        rota,
        "import { r } from '@/infra/arquivo-json/repo';\nexport const y = r;\n",
      ),
    ).not.toHaveLength(0);
    expect(
      await violacoes(rota, "import { r } from '@/infra/memoria/repo';\nexport const y = r;\n"),
    ).not.toHaveLength(0);
  });

  it('páginas e componentes não importam infra', async () => {
    for (const arquivo of ['src/app/page.tsx', 'src/componentes/Botao.tsx']) {
      expect(
        await violacoes(arquivo, "import { c } from '@/infra/container';\nexport const y = c;\n"),
      ).not.toHaveLength(0);
    }
  });
});
