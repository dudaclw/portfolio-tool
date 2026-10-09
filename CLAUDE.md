# CLAUDE.md

As regras de trabalho, os comandos do projeto e a definição de pronto de cada marco estão em
[agent.md](agent.md), que é a fonte única. Leia-o por inteiro no início de cada sessão e siga-o.

@agent.md

## Lembretes rápidos

- Um marco por vez (M0 a M6); ao fechar, rodar `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, mostrar o resultado e parar para validação.
- Domínio (`src/dominio`) em TypeScript puro, sem `Date`, sem React/Next/fs; relógio injetado.
- Rota de API: valida (Zod), chama caso de uso, responde. Nenhuma regra de negócio em rota ou componente.
- Decisão não prevista: registrar em `docs/decisoes.md` (decisão e motivo) e sinalizar ao usuário para ele dar retorno.
- Fora do escopo (seção 10): não implementar; ideias vão para `docs/ideias.md`.
