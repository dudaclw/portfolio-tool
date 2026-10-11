import {
  criarItem,
  type EstadoItem,
  type HistoricoEstado,
  type ItemBacklog,
  type TipoItem,
} from '@/dominio/backlog/item-backlog';
import { criarProjeto } from '@/dominio/projetos/projeto';
import type { Pessoa } from '@/dominio/recursos/recursos';
import { dadosVazios, type Dados } from '../comum/dados';

/** Estados na ordem em que um item do backlog avança (o histórico é montado a partir dela). */
const CAMINHO_DO_BACKLOG: readonly EstadoItem[] = ['novo', 'refinado', 'pronto_para_sprint'];

interface ItemDeExemplo {
  titulo: string;
  tipo?: TipoItem;
  estimativa?: number;
  estado?: EstadoItem;
  /** Dia (AAAA-MM-DD) em que o item foi criado; cada passo seguinte cai um dia depois. */
  criadoEm: string;
}

/**
 * Cria os itens de um projeto, nas posições a partir de `primeiraOrdem`, com histórico de
 * estados coerente: criado como `novo` e, a cada dia seguinte, o próximo estado do caminho.
 */
function montarItens(
  gerarId: () => string,
  projetoId: string,
  primeiraOrdem: number,
  exemplos: ItemDeExemplo[],
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
    const estado = exemplo.estado ?? 'novo';
    itens.push({ ...base, estado });

    const passos = CAMINHO_DO_BACKLOG.slice(0, CAMINHO_DO_BACKLOG.indexOf(estado) + 1);
    passos.forEach((para, passo) => {
      const dia = Number(exemplo.criadoEm.slice(8)) + passo;
      historico.push({
        itemId: base.id,
        de: passo === 0 ? null : (passos[passo - 1] ?? null),
        para,
        em: `${exemplo.criadoEm.slice(0, 8)}${String(dia).padStart(2, '0')}T12:00:00Z`,
      });
    });
  });
  return { itens, historico };
}

/**
 * Dados de exemplo (agent.md, seção 5). Cresce a cada marco: o M1 trouxe pessoas e projetos; o M2
 * traz os itens do backlog e o histórico; sprints entram no M3/M4 e alocações, ausências e
 * feriados no M5.
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

  const backlogDoPortal = montarItens(gerarId, portal.id, 1, [
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

  dados.itens = [...backlogDoPortal.itens, ...backlogDaMigracao.itens];
  dados.historico = [...backlogDoPortal.historico, ...backlogDaMigracao.historico];

  return dados;
}
