import {
  criarItem,
  type EstadoItem,
  type HistoricoEstado,
  type ItemBacklog,
  type TipoItem,
} from '@/dominio/backlog/item-backlog';
import { DEFINICAO_DE_PRONTO_PADRAO, criarProjeto } from '@/dominio/projetos/projeto';
import { feriadosNacionais } from '@/dominio/recursos/feriados';
import type { Pessoa } from '@/dominio/recursos/recursos';
import { criarSprint, type Sprint } from '@/dominio/sprints/sprint';
import { dadosVazios, type Dados } from '../comum/dados';

/** Estados na ordem em que um item do backlog avança (o histórico é montado a partir dela). */
const CAMINHO_DO_BACKLOG: readonly EstadoItem[] = ['novo', 'refinado', 'pronto_para_sprint'];

/** Passo do histórico de um item: o estado em que entrou e o dia (AAAA-MM-DD) em que isso ocorreu. */
type Passo = readonly [EstadoItem, string];

interface ItemDeExemplo {
  titulo: string;
  tipo?: TipoItem;
  estimativa?: number;
  /**
   * Histórico explícito, do primeiro (`novo`) ao estado atual. Sem ele, o item é criado em
   * `criadoEm` e avança um estado do backlog por dia até `estado`.
   */
  percurso?: readonly Passo[];
  estado?: EstadoItem;
  criadoEm?: string;
  /** Item de sprint concluído: todos os critérios da Definição de Pronto marcados. */
  criteriosCumpridos?: boolean;
}

const aoMeioDia = (dia: string) => `${dia}T12:00:00Z`;

function percursoDoBacklog(exemplo: ItemDeExemplo): Passo[] {
  const criadoEm = exemplo.criadoEm ?? '2026-09-01';
  const passos = CAMINHO_DO_BACKLOG.slice(
    0,
    CAMINHO_DO_BACKLOG.indexOf(exemplo.estado ?? 'novo') + 1,
  );
  return passos.map((estado, indice): Passo => {
    const dia = Number(criadoEm.slice(8)) + indice;
    return [estado, `${criadoEm.slice(0, 8)}${String(dia).padStart(2, '0')}`];
  });
}

/**
 * Cria os itens de um projeto, nas posições a partir de `primeiraOrdem`, com histórico de
 * estados coerente (cada passo depois do anterior, terminando no estado atual do item).
 */
function montarItens(
  gerarId: () => string,
  projetoId: string,
  primeiraOrdem: number,
  exemplos: ItemDeExemplo[],
  sprintId: string | null = null,
): { itens: ItemBacklog[]; historico: HistoricoEstado[] } {
  const itens: ItemBacklog[] = [];
  const historico: HistoricoEstado[] = [];
  exemplos.forEach((exemplo, indice) => {
    const base = criarItem(
      gerarId(),
      projetoId,
      {
        titulo: exemplo.titulo,
        tipo: exemplo.tipo ?? 'historia',
        estimativa: exemplo.estimativa ?? null,
      },
      primeiraOrdem + indice,
    );
    const passos = exemplo.percurso ?? percursoDoBacklog(exemplo);
    const estado = passos.at(-1)?.[0] ?? 'novo';
    itens.push({
      ...base,
      estado,
      sprintId,
      dodMarcados: exemplo.criteriosCumpridos ? [...DEFINICAO_DE_PRONTO_PADRAO] : [],
    });
    passos.forEach(([para, dia], passo) => {
      historico.push({
        itemId: base.id,
        de: passo === 0 ? null : (passos[passo - 1]?.[0] ?? null),
        para,
        em: aoMeioDia(dia),
      });
    });
  });
  return { itens, historico };
}

/** Sprint de exemplo: datas pela duração do projeto, com itens planejados na estimativa de cada um. */
function montarSprint(
  gerarId: () => string,
  projetoId: string,
  numero: number,
  inicio: string,
  parcial: Partial<Sprint>,
): Sprint {
  return { ...criarSprint(gerarId(), projetoId, numero, inicio, 15), ...parcial };
}

/**
 * Dados de exemplo (agent.md, seção 5). Cresce a cada marco: o M1 trouxe pessoas e projetos; o M2
 * os itens do backlog e o histórico; o M3 as sprints 1 a 3 (com os itens delas) e os feriados;
 * o M4 acrescenta retrospectiva e o M5 as alocações e ausências.
 */
export function montarDadosDeExemplo(gerarId: () => string): Dados {
  const pessoa = (nome: string, funcao: string, jornadaSemanalHoras: number): Pessoa => ({
    id: gerarId(),
    nome,
    funcao,
    jornadaSemanalHoras,
  });

  const dados = dadosVazios();

  dados.pessoas = [
    pessoa('Ana', 'Desenvolvedora', 40),
    pessoa('Bruno', 'Desenvolvedor', 40),
    pessoa('Carla', 'Product Owner', 40),
    pessoa('Diego', 'Designer', 30),
  ];

  dados.projetos = [
    criarProjeto(gerarId(), {
      nome: 'Portal do Cliente',
      objetivo: 'Permitir que o cliente abra e acompanhe chamados sem depender do atendimento.',
      inicio: '2026-09-14',
      fimPrevisto: '2026-12-18',
      status: 'em_andamento',
      duracaoSprintDias: 15,
    }),
    criarProjeto(gerarId(), {
      nome: 'Migração do RH',
      objetivo: 'Migrar os cadastros e processos de RH para a nova plataforma.',
      inicio: '2026-11-02',
      fimPrevisto: '2027-02-26',
      status: 'planejado',
      duracaoSprintDias: 15,
    }),
  ];

  const [portal, migracao] = dados.projetos;
  if (!portal || !migracao) throw new Error('Projetos de exemplo não criados.');

  // Sprints do projeto A: 1 encerrada, 2 ativa, 3 planejada (datas pela duração de 15 dias).
  const sprint1 = montarSprint(gerarId, portal.id, 1, '2026-09-14', {
    meta: 'Cliente consegue entrar no portal e abrir um chamado',
    situacao: 'encerrada',
    velocity: 13,
  });
  const sprint2 = montarSprint(gerarId, portal.id, 2, '2026-09-29', {
    meta: 'Cliente abre e acompanha chamados',
    situacao: 'ativa',
  });
  const sprint3 = montarSprint(gerarId, portal.id, 3, '2026-10-14', {});

  // Sprint 1: três itens (5, 3 e 5 pontos), todos concluídos e aceitos.
  const itensDaSprint1 = montarItens(
    gerarId,
    portal.id,
    1,
    [
      {
        titulo: 'Entrar no portal com e-mail e senha',
        estimativa: 5,
        criteriosCumpridos: true,
        percurso: [
          ['novo', '2026-09-01'],
          ['refinado', '2026-09-02'],
          ['pronto_para_sprint', '2026-09-03'],
          ['em_andamento', '2026-09-15'],
          ['em_revisao', '2026-09-21'],
          ['concluido', '2026-09-24'],
        ],
      },
      {
        titulo: 'Editar os dados do perfil',
        estimativa: 3,
        criteriosCumpridos: true,
        percurso: [
          ['novo', '2026-09-01'],
          ['refinado', '2026-09-02'],
          ['pronto_para_sprint', '2026-09-03'],
          ['em_andamento', '2026-09-16'],
          ['em_revisao', '2026-09-22'],
          ['concluido', '2026-09-25'],
        ],
      },
      {
        titulo: 'Abrir um chamado',
        estimativa: 5,
        criteriosCumpridos: true,
        percurso: [
          ['novo', '2026-09-01'],
          ['refinado', '2026-09-02'],
          ['pronto_para_sprint', '2026-09-04'],
          ['em_andamento', '2026-09-17'],
          ['em_revisao', '2026-09-24'],
          ['concluido', '2026-09-28'],
        ],
      },
    ],
    sprint1.id,
  );
  sprint1.itens = itensDaSprint1.itens.map((item) => ({
    itemId: item.id,
    estimativaPlanejada: item.estimativa ?? 0,
    adicionadoEm: '2026-09-14T09:00:00Z',
    resultado: 'aceito',
  }));

  // Sprint 2: 5, 3, 8 e 5 pontos (21). O de 5 concluído em 01/10, o de 3 em 06/10, o de 8 em
  // revisão e o outro de 5 em andamento.
  const itensDaSprint2 = montarItens(
    gerarId,
    portal.id,
    4,
    [
      {
        titulo: 'Acompanhar o andamento de um chamado',
        estimativa: 5,
        criteriosCumpridos: true,
        percurso: [
          ['novo', '2026-09-02'],
          ['refinado', '2026-09-08'],
          ['pronto_para_sprint', '2026-09-10'],
          ['em_andamento', '2026-09-29'],
          ['em_revisao', '2026-09-30'],
          ['concluido', '2026-10-01'],
        ],
      },
      {
        titulo: 'Ver o histórico de mensagens do chamado',
        estimativa: 3,
        criteriosCumpridos: true,
        percurso: [
          ['novo', '2026-09-02'],
          ['refinado', '2026-09-08'],
          ['pronto_para_sprint', '2026-09-10'],
          ['em_andamento', '2026-09-30'],
          ['em_revisao', '2026-10-02'],
          ['concluido', '2026-10-06'],
        ],
      },
      {
        titulo: 'Receber as respostas do atendimento no portal',
        estimativa: 8,
        percurso: [
          ['novo', '2026-09-03'],
          ['refinado', '2026-09-09'],
          ['pronto_para_sprint', '2026-09-11'],
          ['em_andamento', '2026-10-01'],
          ['em_revisao', '2026-10-08'],
        ],
      },
      {
        titulo: 'Encerrar um chamado já resolvido',
        estimativa: 5,
        percurso: [
          ['novo', '2026-09-03'],
          ['refinado', '2026-09-09'],
          ['pronto_para_sprint', '2026-09-11'],
          ['em_andamento', '2026-10-07'],
        ],
      },
    ],
    sprint2.id,
  );
  sprint2.itens = itensDaSprint2.itens.map((item) => ({
    itemId: item.id,
    estimativaPlanejada: item.estimativa ?? 0,
    adicionadoEm: '2026-09-29T09:00:00Z',
    resultado: null,
  }));

  // Backlog do projeto A: 8 itens fora de sprint, sete estimados (39 pontos) e um sem estimativa.
  const backlogDoPortal = montarItens(gerarId, portal.id, 8, [
    {
      titulo: 'Listar meus chamados',
      estimativa: 3,
      estado: 'pronto_para_sprint',
      criadoEm: '2026-09-02',
    },
    {
      titulo: 'Filtrar chamados por status',
      estimativa: 5,
      estado: 'pronto_para_sprint',
      criadoEm: '2026-09-02',
    },
    { titulo: 'Responder a um chamado', estimativa: 8, estado: 'refinado', criadoEm: '2026-09-03' },
    { titulo: 'Avaliar o atendimento', estimativa: 2, estado: 'refinado', criadoEm: '2026-09-03' },
    {
      titulo: 'Avisar por e-mail quando o chamado muda',
      estimativa: 5,
      estado: 'refinado',
      criadoEm: '2026-09-04',
    },
    { titulo: 'Painel de indicadores do cliente', estimativa: 13, criadoEm: '2026-09-07' },
    {
      titulo: 'Corrigir a paginação da lista de chamados',
      tipo: 'bug',
      estimativa: 3,
      estado: 'pronto_para_sprint',
      criadoEm: '2026-09-08',
    },
    { titulo: 'Definir o tema visual do portal', tipo: 'tarefa', criadoEm: '2026-09-08' },
  ]);

  const backlogDaMigracao = montarItens(
    gerarId,
    migracao.id,
    1,
    [
      'Inventariar os sistemas atuais de RH',
      'Mapear os campos do cadastro de colaboradores',
      'Definir as regras de migração de férias',
      'Planejar a convivência dos dois sistemas',
      'Preparar o treinamento da equipe de RH',
    ].map((titulo) => ({ titulo, criadoEm: '2026-09-21' })),
  );

  dados.sprints = [sprint1, sprint2, sprint3];
  dados.itens = [
    ...itensDaSprint1.itens,
    ...itensDaSprint2.itens,
    ...backlogDoPortal.itens,
    ...backlogDaMigracao.itens,
  ];
  dados.historico = [
    ...itensDaSprint1.historico,
    ...itensDaSprint2.historico,
    ...backlogDoPortal.historico,
    ...backlogDaMigracao.historico,
  ];
  dados.feriados = [2026, 2027].flatMap(feriadosNacionais);

  return dados;
}
