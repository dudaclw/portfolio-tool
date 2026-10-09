import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Regra de dependência entre camadas (agent.md, regra 4):
// dominio não importa nada de fora; aplicacao importa só dominio;
// infra e interface (app, componentes) importam aplicacao.
// Uma violação quebra o `npm run lint` (e, portanto, o build de verificação).

const SO_DOMINIO_E_RELATIVOS = '^(?!\\.{1,2}(/|$)|@/dominio(/|$)|vitest$)';
const SO_APLICACAO_E_DOMINIO = '^(?!\\.{1,2}(/|$)|@/dominio(/|$)|@/aplicacao(/|$)|vitest$)';

const relativoPara = (...camadas) => `^\\.{1,2}/(.*/)?(${camadas.join('|')})(/|$)`;

const restringir = (mensagem, ...regexes) => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: regexes.map((regex) => ({ regex, message: mensagem })),
    },
  ],
});

const semRelogioNoDominio = {
  'no-restricted-syntax': [
    'error',
    {
      selector: "Identifier[name='Date']",
      message:
        'O domínio não usa Date nem relógio do sistema: receba agora() injetado e use as funções de datas.ts (regra 5).',
    },
  ],
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'node_modules/**', 'out/**', 'next-env.d.ts', 'data/**']),

  {
    name: 'fronteira/dominio',
    files: ['src/dominio/**/*.{ts,tsx}'],
    rules: {
      ...restringir(
        'dominio é TypeScript puro: não importa nada de fora (nem React, nem Next, nem fs, nem outras camadas).',
        SO_DOMINIO_E_RELATIVOS,
        relativoPara('aplicacao', 'infra', 'app', 'componentes'),
      ),
      ...semRelogioNoDominio,
    },
  },
  {
    name: 'fronteira/aplicacao',
    files: ['src/aplicacao/**/*.{ts,tsx}'],
    rules: restringir(
      'aplicacao importa só dominio (nada de infra, interface, React, Next ou fs).',
      SO_APLICACAO_E_DOMINIO,
      relativoPara('infra', 'app', 'componentes'),
    ),
  },
  {
    name: 'fronteira/infra',
    files: ['src/infra/**/*.{ts,tsx}'],
    rules: restringir(
      'infra importa aplicacao e dominio; não conhece a interface nem o framework de UI.',
      '^(react|react-dom|next)(/|$)',
      '^@/(app|componentes)(/|$)',
      relativoPara('app', 'componentes'),
    ),
  },
  {
    name: 'fronteira/rotas-api',
    files: ['src/app/api/**/*.{ts,tsx}'],
    rules: restringir(
      'rotas usam casos de uso via @/infra/container; não conhecem repositórios concretos.',
      '^@/infra/(memoria|arquivo-json)(/|$)',
      relativoPara('memoria', 'arquivo-json'),
    ),
  },
  {
    name: 'fronteira/telas',
    files: ['src/app/**/*.{ts,tsx}', 'src/componentes/**/*.{ts,tsx}'],
    ignores: ['src/app/api/**'],
    rules: restringir(
      'telas e componentes consomem a API /api/v1; não importam infra.',
      '^@/infra(/|$)',
      relativoPara('infra'),
    ),
  },
]);
