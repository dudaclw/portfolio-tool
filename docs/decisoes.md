# Decisões

Decisões tomadas no caminho, com o motivo. As marcadas com ⚠ pedem retorno de quem valida o marco.

## M0

1. ⚠ **"Hoje" é a data UTC do instante.** `dataDoInstante` usa os 10 primeiros caracteres do instante ISO 8601 em UTC. Motivo: é o mais simples e mantém o domínio sem fuso. Efeito: no Brasil (UTC−3), entre 21h e 24h locais o app já considera o dia seguinte (afeta "dias úteis restantes" e o burndown nessa janela). Alternativa se incomodar: o relógio injetado passar a devolver o instante já deslocado para o fuso local, sem mudar o domínio.
2. ⚠ **Repositório git não inicializado.** A pasta não é um repositório git, e a regra 11 pede commits pequenos. Não rodei `git init` por conta própria. Se quiser, inicializo e passo a commitar por etapa.
3. **Raiz do projeto é a pasta atual** (`portfolio-report`), não uma subpasta `mvp/`. Motivo: o `agent.md` já estava aqui.
4. **`CLAUDE.md` importa o `agent.md`** (`@agent.md`) em vez de duplicar as regras. Motivo: fonte única; o `agent.md` já contém a seção 2 inteira.
5. **Versões fixadas (sem `^`).** TypeScript 6.0.3 e não 7.0.2, porque o `typescript-eslint` (usado pelo `eslint-config-next`) aceita só TypeScript < 6.1. ESLint 9.39.5 e não 10, porque os plugins de React/import/jsx-a11y do `eslint-config-next` declaram suporte só até a série 9. `vite` entra como dependência explícita porque o Vitest 5 o exige como peer. Revisar quando o ecossistema alcançar.
6. **Node local é a v26.7.0** (não é LTS). O Vitest 5 exige Node ≥ 22.12 (ou 24/26); o README informa isso.
7. **Fronteira entre camadas com `no-restricted-imports` (regex)**, não `eslint-plugin-boundaries`. Motivo: zero dependência extra e regra legível em `eslint.config.mjs`. Está provada por `lint/fronteira-camadas.test.ts` e foi demonstrada à mão (importar `react` e usar `new Date()` em `src/dominio` quebra o `npm run lint`). Extras além da regra 4: o domínio proíbe o identificador `Date`; telas e componentes não importam `infra`; rotas só importam `infra` via `@/infra/container`.
8. **Datas por aritmética inteira, sem `Date`** (algoritmo de Howard Hinnant). Motivo: a regra 5 proíbe `new Date()` e `Date.now()` no domínio, e assim também não há dependência de fuso horário. O relógio real (`new Date()`) fica só em `src/infra/relogio.ts`.
9. **`npm run dev/build/start` definem `NEXT_TELEMETRY_DISABLED=1` por prefixo de variável** no script. Funciona em macOS e Linux; no Windows exigiria `cross-env` (não adicionado). Também está no `.env.example`.
10. **`npm run seed` e `npm run test:e2e` são stubs** (`scripts/seed.mjs`, `scripts/e2e-pendente.mjs`) que avisam em qual marco chegam. Motivo: a lista de comandos pede que existam desde já. O seed real (M1) será em TypeScript; como `tsx` não está na seção 3, decido lá entre `tsx` (justificado aqui) e o suporte nativo do Node a TypeScript.
11. **Só as dependências do M0 foram instaladas.** `zod`, `recharts`, `@playwright/test` entram nos marcos que os usam (M1, M3/M6, M6).
12. **`npm audit` aponta 5 vulnerabilidades "high"** em `braces`/`micromatch`/`fast-glob` (ReDoS em padrões de glob), todas dependências transitivas do `eslint-config-next`, usadas só pelo lint em desenvolvimento, nunca em tempo de execução. A correção sugerida é rebaixar para `eslint-config-next@14`, o que não se justifica. Aceito até haver atualização upstream.
13. **`tsconfig.json` com `"types": ["node"]`**, porque o TypeScript 6 deixou de carregar `@types/*` automaticamente, e `noUncheckedIndexedAccess` ligado além do modo estrito.
14. **`vitest.config.mts`** (e não `.ts`) para evitar o aviso do Vite sobre ESM em arquivo CommonJS, mantendo `npm test` sem avisos.
15. **Pasta `lint/`** na raiz guarda o teste de fronteira de camadas, por ele testar a configuração do ESLint e não o código de `src`.
16. **Regra 9 do `agent.md` ajustada** a seu pedido: decisão não prevista é registrada aqui e sinalizada a você para retorno.
