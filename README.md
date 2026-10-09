# Portfólio de projetos ágeis

App local para gerir projetos com backlog, sprints, capacidade da equipe e métricas (burndown e
velocity). Roda inteiro no seu computador, sem login, sem contas e sem chamadas de rede em tempo de
execução. Escopo, regras de negócio e marcos: [agent.md](agent.md).

## Requisitos

- Node.js (a partir da versão 22.12, necessária para o Vitest 5) e npm.
- Internet só para o `npm install`; depois disso tudo funciona offline.

## Instalar

```bash
npm install
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
`RELOGIO_FIXO=2026-10-09T12:00:00Z npm run dev`. Veja `.env.example`.

## Testar e verificar

| Comando             | Faz                                                        |
| ------------------- | ---------------------------------------------------------- |
| `npm test`          | Testes unitários e de integração (Vitest)                  |
| `npm run lint`      | ESLint, incluindo a regra de dependência entre camadas     |
| `npm run typecheck` | Verificação de tipos, sem emitir arquivos                  |
| `npm run build`     | Build de produção                                          |
| `npm run seed`      | Dados de exemplo (disponível a partir do M1)               |
| `npm run test:e2e`  | Roteiro de aceite no navegador (disponível a partir do M6) |

## Estrutura

```text
src/dominio/     regras de negócio, TypeScript puro
src/aplicacao/   casos de uso e portas
src/infra/       repositórios (memória e arquivo JSON), relógio, container
src/app/         páginas Next.js e rotas /api/v1
src/componentes/ UI reutilizável
docs/            decisoes.md (decisões tomadas) e ideias.md (fora do escopo)
```

Os dados ficam em `data/dados.json`, fora do git. Para backup, com o app parado, copie o arquivo.
