# 2. Instruções para o Claude Code

Antes de escrever código: leia este documento inteiro e crie na raiz do projeto um `CLAUDE.md` com as regras e os comandos abaixo, para que valham em toda sessão.

## Regras de trabalho

1. Um marco por vez, na ordem M0 a M6 (seção 8). Não comece o seguinte antes de o critério de aceite do atual passar.
2. Domínio primeiro, em TypeScript puro, com testes escritos junto. Cada regra RN do marco tem ao menos um teste, usando os exemplos numéricos da seção 4.
3. Nenhuma regra de negócio em componente React nem em rota de API. A rota faz três coisas: valida a entrada (Zod), chama um caso de uso, devolve a resposta.
4. A dependência só aponta para dentro: dominio não importa nada de fora (nem React, nem Next, nem fs); aplicacao importa só dominio; infra e interface importam aplicacao. Configure uma regra de lint que quebre o build se isso for violado.
5. Relógio injetado. O domínio nunca chama new Date() nem Date.now(); recebe uma função agora(). Datas de calendário são texto AAAA-MM-DD; instantes são texto ISO 8601 em UTC. Isso torna os testes determinísticos.
6. Erros de regra viram ErroDeRegra com codigo (por exemplo RN-02) e mensagem em português. A API os traduz em HTTP 409 ou 422 no formato application/problem+json.
7. Idioma: interface e mensagens em português do Brasil; nomes do domínio em português, iguais ao glossário do SRS (Projeto, Sprint, ItemBacklog); termos técnicos consagrados em inglês.
8. Dependências: só as da seção 3. Precisa de outra? Justifique em uma linha em docs/decisoes.md e use a mais simples. Em tempo de execução o app não faz nenhuma chamada de rede (seção 3, "Execução 100% local").
9. Decisão não prevista aqui: escolha a opção mais simples, registre em docs/decisoes.md (decisão e motivo), sinalize ao usuário para ele dar retorno e siga. Só pare para perguntar se for irreversível ou mudar o escopo.
10. Não invente requisitos. O que está fora do escopo (seção 10) fica fora; ideias vão para docs/ideias.md.
11. Commits pequenos, mensagem em português no imperativo. Ao fechar um marco, rode a verificação completa e relate o resultado.

## Comandos que o projeto deve ter

| Comando | Faz |
| --- | --- |
| `npm run dev` | Sobe o app em modo desenvolvimento |
| `npm test` | Roda os testes unitários e de integração (Vitest) |
| `npm run lint` | Lint, incluindo a regra de dependência entre camadas |
| `npm run typecheck` | Verificação de tipos, sem emitir arquivos |
| `npm run build` | Build de produção |
| `npm run seed` | Recria o arquivo de dados com o projeto de exemplo (seção 5) |
| `npm run test:e2e` | Roteiro de aceite no navegador (Playwright), a partir do M6 |

## Definição de pronto de um marco

- `npm run typecheck`, `npm run lint` e `npm test` passam sem avisos.
- `npm run build` conclui.
- Todos os critérios de aceite do marco foram demonstrados, de preferência por teste automatizado.
- `README.md` explica como instalar, rodar e testar.

## Prompt inicial sugerido

Cole isto na primeira sessão do Claude Code, com este documento anexado ou exportado em Markdown na pasta do projeto:

```text
Leia o documento "Escopo do MVP" por inteiro. Crie o CLAUDE.md com as regras
da seção 2 e comece pelo marco M0. Ao terminar cada marco, rode typecheck,
lint e testes, mostre o resultado e pare para eu validar antes do próximo.
Decisões não previstas: registre em docs/decisoes.md e me sinalize para poder dar retorno.
```

---

# 3. Stack e estrutura de pastas

Um único projeto Next.js, com o domínio isolado em TypeScript puro. Use as versões estáveis vigentes de cada ferramenta e fixe-as no package.json; as versões não foram verificadas neste documento.

| Camada | Escolha | Observação |
| --- | --- | --- |
| Runtime | Node.js (versão LTS vigente) e npm | |
| App | Next.js (App Router), React, TypeScript em modo estrito | Telas e rotas /api/v1 no mesmo projeto |
| Estilo | Tailwind CSS | Componentes próprios e simples; sem biblioteca de interface pesada |
| Validação | Zod | Entrada de toda rota de API |
| Gráficos | Recharts | Burndown e velocity |
| Testes | Vitest (unitário e integração); Playwright (aceite, a partir do M6) | |
| Qualidade | ESLint com regra de fronteira entre camadas; Prettier | Fronteira: eslint-plugin-boundaries ou no-restricted-imports |
| Arrastar e soltar | Nenhum no MVP | Reordenar e mover itens por botões; arrastar é melhoria futura |

```text
mvp/
├─ CLAUDE.md                 # regras e comandos (seção 2)
├─ README.md
├─ docs/
│  ├─ decisoes.md            # decisões tomadas no caminho
│  └─ ideias.md              # ideias fora do escopo
├─ data/                     # dados.json (fora do git)
├─ scripts/seed.ts           # dados de exemplo
├─ e2e/                      # roteiro de aceite (Playwright)
└─ src/
   ├─ dominio/               # TypeScript puro, sem framework nem fs
   │  ├─ compartilhado/      # datas, dias úteis, relógio, ErroDeRegra
   │  ├─ projetos/  backlog/  sprints/  metricas/  recursos/
   ├─ aplicacao/             # casos de uso e portas (interfaces de repositório)
   ├─ infra/
   │  ├─ memoria/            # repositórios em memória (testes)
   │  ├─ arquivo-json/       # repositórios em arquivo (uso real)
   │  └─ container.ts        # monta repositórios e casos de uso
   ├─ app/                   # páginas Next.js e rotas /api/v1
   └─ componentes/           # UI reutilizável
```

Testes unitários ficam ao lado do código (`arquivo.test.ts`). O arquivo `container.ts` é o único lugar que sabe qual repositório concreto está em uso; trocar o modo de armazenamento no futuro é mudar essa linha e acrescentar um adaptador.

## Execução 100% local

O app inteiro roda no computador de quem o usa. A única etapa que precisa de internet é `npm install`, para baixar as dependências; depois disso tudo funciona offline.

| Tema | Regra |
| --- | --- |
| Como rodar | `npm install` uma vez; `npm run dev` e abrir http://localhost:3000. Versão otimizada: `npm run build` e `npm start` |
| Rede | O servidor escuta só em 127.0.0.1 (`next dev -H 127.0.0.1` e `next start -H 127.0.0.1`): ninguém na mesma rede acessa os dados |
| Contas e chaves | Nenhuma. Sem login, sem chave de API, sem variável obrigatória (`RELOGIO_FIXO` é opcional) |
| Serviços externos | Nenhum em tempo de execução. Fontes e ícones empacotados no projeto (nada de CDN nem Google Fonts); sem analytics; telemetria do Next.js desativada (`NEXT_TELEMETRY_DISABLED=1`, também no `.env.example`) |
| Dados | Só em `data/dados.json`, fora do git. Backup: com o app parado, copiar o arquivo |
| Teste de aceite | Rodar o app e os testes com a internet desligada deve funcionar |

---

# 4. Modelo de domínio e regras de negócio

Este é o núcleo do app e vai em `src/dominio`. Os tipos abaixo são a referência; ajustes de detalhe são aceitos se registrados em docs/decisoes.md.

```ts
type Data = string;      // 'AAAA-MM-DD', sem hora
type Instante = string;  // ISO 8601 em UTC

type EstadoItem = 'novo' | 'refinado' | 'pronto_para_sprint'
                | 'em_andamento' | 'em_revisao' | 'concluido';
type TipoItem = 'historia' | 'tarefa' | 'bug' | 'debito_tecnico';

interface Projeto {
  id: string; nome: string; objetivo: string; patrocinador?: string;
  inicio: Data; fimPrevisto: Data;
  status: 'planejado' | 'em_andamento' | 'pausado' | 'concluido' | 'cancelado';
  duracaoSprintDias: number;          // padrão 15, dias corridos
  definicaoDePronto: string[];        // padrão: ver abaixo
}

interface ItemBacklog {
  id: string; projetoId: string; tipo: TipoItem;
  titulo: string; descricao: string; criteriosAceite: string;
  estimativa: number | null;          // 1, 2, 3, 5, 8, 13 ou 21
  ordem: number;                      // posição inteira no backlog
  estado: EstadoItem; responsavelId: string | null;
  impedido: { motivo: string; desde: Instante } | null;
  dodMarcados: string[];              // itens da Definição de Pronto cumpridos
  sprintId: string | null;
}

interface HistoricoEstado { itemId: string; de: EstadoItem | null; para: EstadoItem; em: Instante }

interface ItemNaSprint {
  itemId: string; estimativaPlanejada: number; adicionadoEm: Instante;
  resultado: 'aceito' | 'nao_aceito' | null; feedbackReview?: string;
}

interface Sprint {
  id: string; projetoId: string; numero: number;
  inicio: Data; fim: Data; meta: string;
  situacao: 'planejada' | 'ativa' | 'encerrada';
  itens: ItemNaSprint[]; velocity: number | null;
  retrospectiva?: { bem: string[]; melhorar: string[]; acoes: AcaoRetro[] };
}
interface AcaoRetro { id: string; descricao: string; responsavelId?: string; prazo?: Data; concluida: boolean }

interface Pessoa { id: string; nome: string; funcao: string; jornadaSemanalHoras: number }
interface Alocacao { id: string; pessoaId: string; projetoId: string; inicio: Data; fim: Data; percentual: number } // 1 a 100
interface Ausencia { id: string; pessoaId: string; inicio: Data; fim: Data }
interface Feriado { data: Data; nome: string }
```

Definição de Pronto padrão (editável por projeto): "Critérios de aceite atendidos", "Testado", "Revisado por outra pessoa", "Documentação atualizada quando aplicável".

## Regras e exemplos para os testes

Cada linha vira pelo menos um teste automatizado. Os números são exatos de propósito: use-os como casos de teste.

| ID | Regra | Exemplo de teste |
| --- | --- | --- |
| RN-01 | Depois que a sprint inicia, suas datas não mudam. | Sprint ativa; alterar fim → ErroDeRegra RN-01. |
| RN-02 | Só uma sprint ativa por projeto. | Sprint 1 ativa; iniciar a sprint 2 → RN-02. |
| RN-03 | A meta não muda com a sprint ativa; itens podem entrar e sair. | Editar meta de sprint ativa → RN-03; adicionar item → permitido. |
| RN-04 | Item só vai a concluido com todos os critérios da Definição de Pronto marcados. | Item com 3 de 4 marcados → concluido recusado (RN-04). |
| RN-05 | Ao encerrar, itens sem resultado aceito voltam ao backlog: estado pronto_para_sprint, sprintId nulo, no topo, mantendo a ordem relativa. | Sprint com itens A (aceito) e B (não aceito): B volta ao topo do backlog; A permanece concluido. |
| RN-06 | velocity = soma de estimativaPlanejada dos itens aceito. | Itens planejados com 5, 3 e 8 pontos; aceitos os de 5 e 3 → velocity 8. Reestimar o de 5 para 13 depois não altera a velocity. |
| RN-07 | Capacidade em horas = soma, por pessoa e por dia útil não ausente da sprint, de (jornada semanal ÷ 5) × (percentual ÷ 100). | Ver exemplo de capacidade abaixo. |
| RN-08 | Se a soma dos percentuais de uma pessoa passar de 100 em algum dia, o app avisa (não bloqueia). | Pessoa com 60% no projeto X e 50% no projeto Y de 2026-11-02 a 2026-11-13 → aviso RN-08 com pico de 110%. |
| RN-09 | Velocity é do projeto, nunca da pessoa. | Nenhuma tela nem endpoint expõe velocity por pessoa (verificação por revisão). |
| RN-10 | Só itens pronto_para_sprint entram em uma sprint, e uma sprint não inicia sem meta e sem itens. | Adicionar item novo → recusado; iniciar sprint com meta vazia → recusado. |
| RN-11 | Percentual de conclusão do projeto = pontos de itens concluido ÷ pontos de todos os itens estimados. Itens sem estimativa ficam de fora e a tela mostra quantos são. | 20 pontos estimados, 8 concluídos → 40%; 2 itens sem estimativa → "2 itens sem estimativa". |

## Cálculos de referência

**Fim da sprint.** fim = inicio + (duracaoSprintDias − 1) dias corridos. Início 2026-10-19 com duração 15 → fim 2026-11-02. Ao criar uma sprint, o início padrão é o dia seguinte ao fim da anterior (ou o início do projeto, se for a primeira).

**Dias úteis.** Todos os dias do intervalo, exceto sábados, domingos e datas em Feriado. Carga inicial de feriados: 01/01, 21/04, 01/05, 07/09, 12/10, 02/11, 15/11, 20/11, 25/12 de cada ano, mais a Sexta-feira Santa (dois dias antes da Páscoa; 2026-04-03 e 2027-03-26 servem de teste).

**Exemplo de capacidade (RN-07).** Sprint de 2026-10-19 a 2026-11-02 com feriado em 2026-11-02:

- Dias úteis: 19 a 23/10 (5) + 26 a 30/10 (5) = 10 dias (o dia 02/11 é segunda-feira e feriado).
- Ana: jornada 40 h/semana (8 h/dia), alocação 100% → 10 × 8 × 1,0 = 80 h.
- Bruno: jornada 40 h/semana, alocação 50%, ausente em 2 dias úteis → (10 − 2) × 8 × 0,5 = 32 h.
- Capacidade da sprint: 112 h.

**Burndown** (calculado do histórico, sem foto diária). Para cada dia útil D da sprint até hoje, restante(D) = soma de estimativaPlanejada dos itens da sprint já adicionados até D cujo estado ao fim de D, reconstruído de HistoricoEstado, não é concluido. escopo(D) = soma dos itens adicionados até D. A linha ideal desce linearmente do escopo inicial até 0 no último dia útil. Dias não úteis não geram ponto.

Exemplo: itens de 5, 3 e 8 pontos (16 no total) adicionados no dia 1. O de 5 conclui no dia 3 e o de 3 no dia 6. Série de restante nos dias úteis 1 a 6: 16, 16, 11, 11, 11, 8. Se um item de 2 pontos entrar no dia 4, escopo passa de 16 para 18 a partir do dia 4 e restante do dia 4 vira 13.

---

# 5. Persistência sem banco

O app guarda os dados em um arquivo JSON local, mas o resto do código só conhece interfaces (portas). Isso mantém o domínio testável sem disco e deixa o armazenamento trocável no futuro, sem mudar regras nem telas.

## Portas (em src/aplicacao)

```ts
interface Repositorio<T extends { id: string }> {
  listar(): Promise<T[]>;
  obter(id: string): Promise<T | null>;
  salvar(entidade: T): Promise<void>;   // cria ou substitui
  remover(id: string): Promise<void>;
}
// Específicos: itens por projeto, sprints por projeto, histórico por itens,
// alocações por pessoa ou projeto, feriados por ano.

interface Transacao {
  executar<R>(trabalho: () => Promise<R>): Promise<R>; // tudo ou nada
}
```

Todos os métodos são assíncronos desde já, mesmo que o arquivo seja síncrono, para que o armazenamento possa ser trocado no futuro sem mudar quem chama.

## Regras do adaptador de arquivo

1. Arquivo `data/dados.json`, fora do git, com a forma `{ versaoEsquema: 1, projetos, itens, historico, sprints, pessoas, alocacoes, ausencias, feriados }`. O campo `versaoEsquema` permite migrar dados antigos no futuro.
2. Leitura uma vez, cache em memória. No Next.js em desenvolvimento, guardar a instância em `globalThis` para o recarregamento a quente não recriá-la.
3. Gravação atômica: escrever em `dados.json.tmp` e renomear para `dados.json`. Uma queda no meio da escrita nunca deixa o arquivo pela metade.
4. Escritas em fila (uma por vez), para duas requisições simultâneas não se atropelarem.
5. Transação tudo ou nada. `executar` aplica as mudanças numa cópia em memória e só grava se o trabalho terminar sem erro. É o que garante RN-05: ao encerrar a sprint, ou tudo muda, ou nada muda.
6. Identificadores com `crypto.randomUUID()`.
7. A versão em memória dos repositórios implementa as mesmas interfaces e é usada em todos os testes; nenhum teste toca o disco, exceto os testes do próprio adaptador de arquivo, que usam uma pasta temporária.

## Dados de exemplo (npm run seed)

O comando recria o arquivo com o conteúdo abaixo, incluindo histórico de estados com datas coerentes, para o burndown aparecer desenhado já na primeira execução.

| Item | Conteúdo |
| --- | --- |
| Pessoas | Ana (desenvolvedora, 40 h/semana), Bruno (desenvolvedor, 40 h), Carla (Product Owner, 40 h), Diego (designer, 30 h) |
| Projeto A, "Portal do Cliente" | Em andamento, 2026-09-14 a 2026-12-18, sprints de 15 dias |
| Sprint 1 (encerrada) | 2026-09-14 a 2026-09-28; itens de 5, 3 e 5 pontos, todos aceitos; velocity 13 |
| Sprint 2 (ativa) | 2026-09-29 a 2026-10-13; meta "Cliente abre e acompanha chamados"; itens de 5, 3, 8 e 5 pontos (21); o de 5 concluído em 2026-10-01, o de 3 em 2026-10-06, o de 8 em revisão, o outro de 5 em andamento |
| Sprint 3 (planejada) | 2026-10-14 a 2026-10-28, sem itens |
| Backlog do projeto A | 8 itens fora de sprint: sete estimados (3, 5, 8, 2, 5, 13 e 3 pontos) e um sem estimativa; estados variados (novo, refinado, pronto_para_sprint) |
| Projeto B, "Migração do RH" | Planejado, 2026-11-02 a 2027-02-26, sem sprints, 5 itens novo |
| Alocações | Ana 100% e Bruno 100% no projeto A; Carla 50% no A; Diego 60% no A (até 2026-12-18) e 50% no B (2026-11-02 a 2027-02-26), o que gera 110% de 2026-11-02 a 2026-12-18 e dispara o aviso RN-08 |
| Ausência | Bruno, 2026-10-06 a 2026-10-07 |
| Feriados | Carga inicial da seção 4, para 2026 e 2027 |

Valores esperados na tela com os dados de exemplo: percentual de conclusão do projeto A = 21 ÷ 73 pontos estimados ≈ 29% (1 item sem estimativa); velocity da sprint 1 = 13.

---

# 6. API

Rotas REST em `src/app/api/v1`, no formato da arquitetura (subconjunto, sem autenticação). As telas consomem só essas rotas, nunca o domínio diretamente, para que o app continue organizado e possa ganhar outro cliente no futuro.

## Convenções

- JSON em camelCase; datas de calendário AAAA-MM-DD; instantes em ISO 8601 UTC.
- Entrada validada com Zod; falha de validação retorna 422 com a lista de campos.
- Violação de regra (ErroDeRegra) retorna 409 em application/problem+json, com `title`, `detail` em português e `codigo` (por exemplo RN-02).
- Recurso inexistente retorna 404.
- Operações que apenas avisam (RN-08) respondem 200 com um campo `avisos: [{ codigo, mensagem }]` ao lado dos dados.
- Ações com regra (iniciar, encerrar, mover, transicionar) são POST de comando, nunca PATCH de campo.

## Endpoints

| Grupo | Rota | Faz | Regras |
| --- | --- | --- | --- |
| Projetos | `GET /projetos`, `POST /projetos` | Lista com resumo (status, sprint atual, % concluído) e cria | Fim previsto ≥ início |
| | `GET /projetos/{id}`, `PATCH /projetos/{id}` | Lê e edita | |
| Backlog | `GET /projetos/{id}/itens`, `POST /projetos/{id}/itens` | Lista ordenada e cria (novo item entra no fim) | Estimativa na escala 1, 2, 3, 5, 8, 13, 21 |
| | `GET /itens/{id}`, `PATCH /itens/{id}`, `DELETE /itens/{id}` | Lê (com histórico), edita campos, remove | Só remove item fora de sprint |
| | `POST /itens/{id}/mover { direcao: "acima" \| "abaixo" }` | Reordena | Troca de posição com o vizinho |
| | `POST /itens/{id}/transicoes { para }` | Muda de estado e grava histórico | RN-04 |
| | `PUT /itens/{id}/definicao-de-pronto { marcados: [] }` | Marca critérios cumpridos | |
| | `PUT /itens/{id}/impedimento { motivo }`, `DELETE /itens/{id}/impedimento` | Marca e remove impedimento | |
| Sprints | `GET /projetos/{id}/sprints`, `POST /projetos/{id}/sprints` | Lista e cria | Datas pela duração (seção 4) |
| | `GET /sprints/{id}` | Lê com itens, resultados e retrospectiva | |
| | `PUT /sprints/{id}/planejamento { meta, itemIds }` | Define meta e itens | RN-03, RN-10 |
| | `POST /sprints/{id}/iniciar` | Torna ativa | RN-02, RN-10 |
| | `PUT /sprints/{id}/review { resultados: [{ itemId, resultado, feedback }] }` | Registra aceite por item | Só com sprint ativa |
| | `PUT /sprints/{id}/retrospectiva` | Salva o que foi bem, melhorar e ações | |
| | `POST /sprints/{id}/encerrar` | Encerra, calcula velocity, devolve itens ao backlog | RN-05, RN-06; transação |
| Métricas | `GET /sprints/{id}/burndown` | Série restante, escopo e linha ideal por dia útil | Seção 4 |
| | `GET /sprints/{id}/capacidade` | Capacidade em horas, por pessoa e total | RN-07 |
| | `GET /projetos/{id}/velocity` | Velocity por sprint e média das 3 últimas | RN-06 |
| | `GET /projetos/{id}/progresso` | Pontos concluídos e totais, %, itens sem estimativa | RN-11 |
| Macro | `GET /portfolio` | Projetos com status, datas, % e sprint atual, para painel e linha do tempo | |
| Recursos | `GET`, `POST /pessoas`; `PATCH`, `DELETE /pessoas/{id}` | Cadastro | Jornada > 0 |
| | `GET`, `POST /alocacoes`; `DELETE /alocacoes/{id}` | Alocação por projeto e período | Percentual 1 a 100; devolve avisos RN-08 |
| | `GET`, `POST /ausencias`; `DELETE /ausencias/{id}` | Ausências | |
| | `GET`, `POST /feriados`; `DELETE /feriados/{data}` | Feriados | |
| | `GET /carga?de=&ate=` | Mapa de carga: pico de % por pessoa e por semana | RN-08 |
| Sistema | `GET /saude` | Responde `{ status: "ok" }` | |

---

# 7. Telas

Nove telas em português, cada uma ligada a um módulo. A navegação principal tem Painel e Equipe; dentro de um projeto, abas Visão geral, Backlog, Sprints e Métricas.

| Tela e rota | Mostra | Permite |
| --- | --- | --- |
| **Painel** `/` | Todos os projetos: nome, status, início e fim, % concluído, sprint atual com dias úteis restantes, alertas (itens impedidos, sobrecarga). Alternância Lista e Linha do tempo: uma barra por projeto do início ao fim previsto, sprints marcadas dentro dela e uma linha vertical em "hoje" | Criar projeto; abrir projeto; alternar a visão |
| **Visão geral** `/projetos/[id]` | Objetivo, datas, status, % concluído com a fórmula, velocity média das 3 últimas, sprint atual (meta, dias restantes), impedimentos abertos, pessoas alocadas | Editar dados e status; editar a Definição de Pronto |
| **Backlog** `/projetos/[id]/backlog` | Lista ordenada com tipo, título, pontos, estado, responsável e sinal de impedimento; total de pontos e pontos "prontos para sprint" | Criar e editar item (janela modal); subir e descer; mudar estado (novo, refinado, pronto); marcar impedimento; remover |
| **Sprints** `/projetos/[id]/sprints` | Lista de sprints com número, datas, meta, situação e velocity | Criar sprint; abrir planejamento, quadro ou review |
| **Planejamento** `.../sprints/[sprintId]/planejamento` | Capacidade em horas (por pessoa e total), velocity média das 3 últimas, pontos escolhidos com aviso quando passam da média, ações em aberto da última retrospectiva, itens pronto_para_sprint para escolher | Escrever a meta; escolher itens; iniciar a sprint |
| **Quadro** `.../sprints/[sprintId]` | Quatro colunas (A fazer, Em andamento, Em revisão, Concluído), burndown ao lado, dias úteis restantes, meta | Mover cartão para a coluna vizinha por botões; marcar critérios da Definição de Pronto; marcar impedimento; adicionar ou tirar item (RN-03) |
| **Review e retrospectiva** `.../sprints/[sprintId]/review` | Itens da sprint com resultado e feedback; três blocos da retrospectiva (o que foi bem, o que melhorar, ações com responsável e prazo) | Marcar aceito ou não aceito por item; registrar a retrospectiva; encerrar a sprint (com confirmação) |
| **Métricas** `/projetos/[id]/metricas` | Burndown da sprint escolhida, velocity por sprint com a média, progresso do projeto | Escolher a sprint exibida |
| **Equipe** `/equipe` | Pessoas; alocações; ausências; feriados; mapa de carga (tabela pessoa × semana, com o pico de % e destaque acima de 100) | Cadastrar e editar pessoas, alocações, ausências e feriados; ver avisos RN-08 |

Esboço do Quadro, para fixar a disposição:

```text
+--------------------------------------------------------------------------+
| Portal do Cliente > Sprint 2   29/09 a 13/10   Faltam 2 dias úteis       |
| Meta: Cliente abre e acompanha chamados          [Review e retro]        |
+--------------------------------------------------------------------------+
| A fazer      | Em andamento | Em revisão   | Concluído    |  Burndown      |
| +----------+ | +----------+ | +----------+ | +----------+ |  (linha real   |
| | Título   | | | Título   | | | Título   | | | Título   | |   e ideal)     |
| | 5 pts Ana| | | 5 pts Bru| | | 8 pts Ana| | | 5 pts Ana| |                |
| | [>]      | | | [<] [>]  | | | [<] [>]  | | | [<]      | |  Restante: 13  |
| +----------+ | +----------+ | +----------+ | +----------+ |  Escopo: 21    |
+--------------------------------------------------------------------------+
```

## Padrões de interface

- Textos, rótulos e mensagens em português do Brasil; datas exibidas como dd/mm/aaaa.
- Mensagens de regra de negócio aparecem como foram devolvidas pela API (`detail`), sem reescrever, em um aviso visível ao lado da ação.
- Ações irreversíveis (encerrar sprint, remover item) pedem confirmação.
- Toda lista vazia explica o próximo passo (por exemplo, "Nenhum item ainda. Crie o primeiro item do backlog.").
- Acessibilidade (RNF-11): tudo operável por teclado, foco visível, rótulos em todos os campos, contraste adequado e estado nunca indicado só por cor. Mover itens por botões ajuda nisso.
- Layout responsivo a partir de 360 px (RNF-10); o quadro rola na horizontal em telas estreitas.
- Nenhuma tela exibe velocity por pessoa (RN-09).

---

# 8. Marcos de construção

Sete marcos, em ordem. Cada um termina com algo que roda e com critérios que se verificam por teste. Pare ao fim de cada marco para validação (seção 2).

## M0. Fundação

**Entrega:** projeto Next.js com TypeScript estrito, Tailwind, Vitest, ESLint (com a regra de fronteira entre camadas) e Prettier; estrutura de pastas da seção 3; CLAUDE.md e README.md; ErroDeRegra; relógio injetável; utilitários de data (somar dias, dia da semana, intervalo, dias úteis, Sexta-feira Santa); rota GET /api/v1/saude; layout base com a navegação.

**Aceite:**
- typecheck, lint, test e build passam.
- Testes: dias úteis de 2026-10-19 a 2026-11-02 com feriado em 2026-11-02 = 10; fim da sprint com início 2026-10-19 e duração 15 = 2026-11-02; Sexta-feira Santa = 2026-04-03 (2026) e 2027-03-26 em 2027.
- Uma importação de react dentro de src/dominio quebra o lint (demonstrar).

## M1. Persistência e projetos

**Entrega:** portas e os dois adaptadores (memória e arquivo JSON, com gravação atômica, fila e transação); container.ts; npm run seed com pessoas e projetos; casos de uso e rotas de projetos; tela Painel (lista) com criar e editar projeto; Visão geral básica.

**Aceite:**
- Reiniciar o servidor mantém os dados.
- Teste do adaptador: um erro no meio de uma transação não grava nada.
- Criar projeto com fim previsto anterior ao início retorna 422.
- O Painel lista os dois projetos de exemplo.

## M2. Backlog

**Entrega:** itens com tipo, estimativa, responsável, estado, Definição de Pronto e impedimento; histórico de estados gravado em toda transição; ordenação por botões; rotas e tela Backlog com janela de criação e edição.

**Aceite:**
- RN-04: item com 3 de 4 critérios não vai a concluido.
- Estimativa 4 retorna 422.
- Subir e descer mantém as posições contíguas (1 a N, sem lacunas nem repetição).
- Cada mudança de estado cria um HistoricoEstado.

## M3. Sprints: planejar, iniciar e rodar

**Entrega:** criar sprint (datas pela duração), planejamento (meta e itens), iniciar, Quadro com mover cartões; telas Sprints, Planejamento (por ora com velocity média e pontos escolhidos, sem capacidade) e Quadro.

**Aceite:**
- Testes de RN-01, RN-02, RN-03 e RN-10 com os exemplos da seção 4.
- Item novo recusado no planejamento; iniciar sem meta recusado.
- Mover cartão no quadro altera o estado e grava histórico.
- Adicionar item a sprint ativa é permitido; editar a meta, não.

## M4. Review, retrospectiva e encerramento

**Entrega:** registro de aceite por item, retrospectiva com ações, encerramento transacional com cálculo de velocity; tela Review e retrospectiva; ações abertas da última retrospectiva visíveis no Planejamento.

**Aceite:**
- RN-06: itens planejados com 5, 3 e 8, aceitos 5 e 3 → velocity 8; reestimar depois não muda.
- RN-05: o item não aceito volta ao topo do backlog como pronto_para_sprint; o aceito continua concluido.
- Falha simulada no meio do encerramento não altera nada (teste com repositório que lança erro).

## M5. Equipe, alocação e capacidade

**Entrega:** pessoas, alocações, ausências e feriados (rotas e tela Equipe); capacidade da sprint e mapa de carga; capacidade exibida no Planejamento e na Visão geral; avisos RN-08 nas respostas e na tela.

**Aceite:**
- RN-07: o exemplo da seção 4 resulta em 112 h (Ana 80 h, Bruno 32 h).
- Com os dados de exemplo, o mapa mostra Diego com pico de 110% de 2026-11-02 a 2026-12-18 e o aviso RN-08.
- Nenhuma rota nem tela expõe velocity por pessoa.

## M6. Métricas, visão macro e aceite final

**Entrega:** burndown (calculado do histórico), velocity e progresso; tela Métricas; Linha do tempo no Painel; roteiro de aceite automatizado (seção 9); README.md final.

**Aceite:**
- Burndown do exemplo da seção 4: restante 16, 16, 11, 11, 11, 8; com o item extra no dia 4, escopo 18 e restante 13 nesse dia.
- Com os dados de exemplo: Projeto A mostra ≈ 29% e "1 item sem estimativa"; velocity da sprint 1 = 13.
- O roteiro de aceite passa de ponta a ponta com npm run test:e2e.

---

# 9. Testes e roteiro de aceite

## Estratégia de testes

| Nível | Cobre | Observação |
| --- | --- | --- |
| Unitário do domínio | RN-01 a RN-11, datas e dias úteis, capacidade, velocity, burndown, progresso | Sem disco e sem rede; roda em segundos. Usa os exemplos numéricos da seção 4 |
| Integração | Casos de uso e rotas da API com repositórios em memória | Confere códigos 200, 404, 409 e 422 e o corpo problem+json |
| Adaptador de arquivo | Gravação atômica, transação tudo ou nada, fila de escritas | Usa pasta temporária, apagada no fim |
| Fronteira de camadas | dominio sem importar de fora | Falha no lint |
| Aceite no navegador | O roteiro abaixo | Playwright, a partir do M6; roda sobre uma cópia dos dados de exemplo |

O app aceita a variável de ambiente `RELOGIO_FIXO` (por exemplo `2026-10-09T12:00:00Z`) para fixar "hoje". Os testes de aceite e a demonstração com os dados de exemplo dependem dela. Dias úteis restantes contam o dia de hoje quando ele é útil. Com menos de 3 sprints encerradas, a velocity média usa as disponíveis; sem nenhuma, a tela mostra "sem dados".

## Roteiro de aceite do MVP

Parte dos dados de exemplo (`npm run seed`) com `RELOGIO_FIXO=2026-10-09T12:00:00Z`. Cada passo traz o resultado exato esperado.

1. **Painel.** Dois projetos. "Portal do Cliente": ≈ 29%, "1 item sem estimativa", sprint 2 ativa com 2 dias úteis restantes (09/10 e 13/10; 12/10 é feriado).
2. **Quadro da sprint 2.** Quatro cartões nas colunas: um concluído de 5 pontos e um de 3 já em Concluído, um de 8 em Em revisão e um de 5 em Em andamento. Burndown com escopo 21 e restante 13.
3. **Regra da Definição de Pronto.** Mover o cartão de 8 pontos para Concluído sem marcar os critérios mostra o erro RN-04 ao lado da ação. Marcar os quatro critérios e mover funciona; restante passa a 5.
4. **Impedimento.** Marcar o cartão em andamento como impedido, com motivo. O cartão exibe o sinal e o Painel mostra o alerta de item impedido.
5. **Review e retrospectiva.** Marcar aceitos os cartões de 5, 3 e 8 pontos e não aceito o outro de 5. Registrar uma retrospectiva com uma ação (responsável e prazo).
6. **Encerramento.** Encerrar a sprint 2 com confirmação. Velocity = 16; o cartão de 5 pontos não aceito volta ao topo do backlog como pronto_para_sprint. Progresso do projeto A: 29 ÷ 73 ≈ 40%. Velocity média das sprints encerradas: (13 + 16) ÷ 2 = 14,5.
7. **Planejamento da sprint 3 (14/10 a 28/10).** Capacidade: 11 dias úteis; Ana 88 h, Bruno 88 h, Carla 44 h, Diego 39,6 h; total 259,6 h. A ação da retrospectiva aparece em aberto. Escolher itens que somem mais de 14,5 pontos mostra o aviso de carga acima da média. Escrever a meta e iniciar.
8. **Regra de uma sprint ativa.** Criar a sprint 4 e tentar iniciá-la com a sprint 3 ativa mostra o erro RN-02.
9. **Equipe.** O mapa de carga mostra Diego com 110% em todas as semanas de 02/11 a 18/12, com destaque e aviso RN-08.
10. **Métricas.** Velocity: sprint 1 = 13, sprint 2 = 16, média 14,5; burndown da sprint 3 começando em seu escopo planejado.
11. **Persistência.** Reiniciar o servidor e conferir que tudo continua como estava.

---

# 10. Fora do escopo e evolução futura

## Fora do escopo do MVP

O agente não deve implementar nada desta lista; ideias novas vão para docs/ideias.md.

| Item | Requisitos do SRS | Quando entra |
| --- | --- | --- |
| Login, perfis e permissões, convites | RF-01 a RF-04 | Quando o app for usado por mais de uma pessoa |
| Auditoria | RF-46 | Quando houver mais de um usuário |
| Foto diária e worker | Arquitetura, seções 5 e 7 | Só se o burndown sob demanda ficar lento |
| Anexos, comentários, épicos, dependências | RF-11 (épico), RF-15, RF-17, RF-18 | Releases 2 e 3 |
| Riscos, marcos, saúde do projeto, burnup, previsão de término, filtros, exportação, notificações, relatório de status | RF-07 a RF-09, RF-29, RF-32, RF-33, RF-36, RF-43 a RF-45, RF-48 | Release 2 |
| Notas da Daily, agenda e indicador de prontidão do refinamento | RF-22, RF-23 | Release 2 |
| Arquivar projeto, cancelar sprint, busca global | RF-10, RF-27, RF-47 | Release 3 |
| Arrastar e soltar | Melhoria de RF-12 e RF-21 | Após validar o fluxo |
| Integrações externas | RF-49 | Fora desta fase do produto |
| Hospedagem, pipeline de entrega, observabilidade | Arquitetura, seções 9 e 10 | Depois de o MVP ser validado |

**Sobre o refinamento.** No MVP ele é praticado pelos estados do item (novo, refinado, pronto_para_sprint) e pela tela Backlog, que mostra quantos pontos estão prontos para a próxima sprint. Agendar sessões de refinamento e ter um indicador de prontidão ficam para a Release 2.

## Se for preciso reduzir ainda mais

Este MVP tem sete marcos e é grande para uma primeira entrega. Se faltar tempo, corte nesta ordem, do que menos prejudica o fluxo para o que mais prejudica:

1. Linha do tempo do Painel (a lista basta).
2. Mapa de carga por semana (manter só os avisos RN-08 e a capacidade).
3. Retrospectiva com ações (manter só o texto livre).
4. Tela de Métricas separada (manter burndown no Quadro e velocity na Visão geral).

Não corte: regras RN-01 a RN-06, histórico de estados, encerramento transacional. São o que diferencia o app de uma lista de tarefas.

## Evolução futura (não agora)

Nada desta seção entra agora. Ela registra o que este MVP faz para não fechar portas:

1. Repositórios atrás de interfaces, com os testes escritos como suíte reutilizável já no M1. Se um dia o armazenamento mudar, a mesma suíte prova que nada quebrou.
2. Campo `versaoEsquema` no arquivo de dados, para migrar dados antigos se a estrutura mudar.
3. Domínio sem dependência de framework nem de disco, o que vale seja qual for o armazenamento.
4. Backup simples: com o app parado, copie `data/dados.json` para guardar uma versão.
5. Decisões de banco, login e hospedagem estão na arquitetura (seções 5, 8 e 9) e só voltam à pauta quando houver mais de uma pessoa usando o app.

## Como usar este documento

Exporte-o em Markdown para a pasta do projeto e cole o prompt da seção 2 no Claude Code. O agente deve parar ao fim de cada marco; você valida a tela e os números da seção 9 antes de liberar o seguinte.
