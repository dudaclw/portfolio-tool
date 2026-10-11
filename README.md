# Portfólio de projetos ágeis

App local para gerir projetos com backlog, sprints, capacidade da equipe e métricas (burndown e
velocity). Roda inteiro no seu computador, sem login, sem contas e sem chamadas de rede em tempo de
execução. Escopo, regras de negócio e marcos: [agent.md](agent.md). Decisões tomadas no caminho:
[docs/decisoes.md](docs/decisoes.md).

## Requisitos

- Node.js (a partir da versão 22.12, necessária para o Vitest 5) e npm.
- Google Chrome instalado, só para o roteiro de aceite (`npm run test:e2e`); nenhum navegador é
  baixado.
- Internet só para o `npm install`; depois disso tudo funciona offline.

## Instalar

```bash
npm install
```

Para começar com os dados de exemplo (dois projetos, quatro pessoas, sprints, alocações e
feriados de 2026 e 2027), com o app parado:

```bash
npm run seed
```

## Rodar

```bash
npm run dev
```

Abra http://localhost:3000. O servidor escuta apenas em 127.0.0.1, então ninguém na mesma rede
acessa seus dados. Para a versão otimizada:

```bash
npm run build
npm start
```

Para fixar "hoje" (testes e demonstrações), defina `RELOGIO_FIXO`, por exemplo
`RELOGIO_FIXO=2026-10-09T12:00:00Z npm run dev`. Com os dados de exemplo e essa data, as telas
mostram exatamente os números do roteiro de aceite (seção 9 do `agent.md`). Veja `.env.example`.

## O que tem no app

| Tela | Onde | Para quê |
| --- | --- | --- |
| Painel | `/` | Projetos com % concluído, sprint atual e alertas; alterna Lista e Linha do tempo |
| Visão geral | `/projetos/[id]` | Dados do projeto, % concluído, impedimentos, sprint atual com capacidade, pessoas alocadas |
| Backlog | `/projetos/[id]/backlog` | Itens em ordem de prioridade; criar, editar, subir e descer, mudar estado, impedir, remover |
| Sprints | `/projetos/[id]/sprints` | Criar sprint e abrir planejamento, quadro ou review |
| Planejamento | `.../sprints/[sprintId]/planejamento` | Meta, itens, capacidade em horas, velocity média, ações da última retrospectiva |
| Quadro | `.../sprints/[sprintId]` | Quatro colunas, mover cartões por botões, Definição de Pronto, impedimento, burndown |
| Review e retrospectiva | `.../sprints/[sprintId]/review` | Aceite por item, retrospectiva com ações, encerrar a sprint |
| Métricas | `/projetos/[id]/metricas` | Progresso, burndown da sprint escolhida, velocity por sprint e média |
| Equipe | `/equipe` | Pessoas, alocações (com aviso de sobrecarga), mapa de carga, ausências, feriados |

As telas usam só a API em `/api/v1` (rotas na seção 6 do `agent.md`). Erros de regra de negócio
voltam como `409 application/problem+json` com o código da regra (por exemplo `RN-04`); dados
inválidos, `422` com a lista de campos.

## Testar e verificar

| Comando             | Faz                                                                 |
| ------------------- | ------------------------------------------------------------------- |
| `npm test`          | Testes unitários e de integração (Vitest)                           |
| `npm run lint`      | ESLint, incluindo a regra de dependência entre camadas              |
| `npm run typecheck` | Verificação de tipos, sem emitir arquivos                           |
| `npm run build`     | Build de produção                                                   |
| `npm run seed`      | Recria `data/dados.json` com os dados de exemplo (pare o app antes) |
| `npm run test:e2e`  | Roteiro de aceite no navegador (Playwright, Google Chrome)          |

O roteiro de aceite (`e2e/aceite.spec.ts`) percorre os 11 passos da seção 9 do `agent.md`. Ele
compila o app numa pasta própria (`.next-e2e`), grava uma cópia dos dados de exemplo num arquivo
temporário, sobe o servidor na porta 3100 com `RELOGIO_FIXO=2026-10-09T12:00:00Z` e o reinicia no
passo 11. Pode rodar com o `npm run dev` aberto: não toca em `data/dados.json` nem na porta 3000.

## Estrutura

```text
src/dominio/     regras de negócio, TypeScript puro (sem React, Next, fs nem Date)
src/aplicacao/   casos de uso e portas (interfaces dos repositórios)
src/infra/       repositórios (memória e arquivo JSON), relógio, container, dados de exemplo
src/app/         páginas Next.js e rotas /api/v1
src/componentes/ UI reutilizável
e2e/             roteiro de aceite (Playwright)
docs/            decisoes.md (decisões tomadas) e ideias.md (fora do escopo)
```

## Dados e backup

Os dados ficam em `data/dados.json`, fora do git. Cada gravação é atômica (arquivo temporário e
renomeação), então uma queda no meio não deixa o arquivo pela metade. Para backup, com o app
parado, copie o arquivo. Para usar outro arquivo, defina `ARQUIVO_DE_DADOS` com o caminho dele.
