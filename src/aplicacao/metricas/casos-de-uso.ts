import type { HistoricoEstado } from '@/dominio/backlog/item-backlog';
import type { Relogio } from '@/dominio/compartilhado/relogio';
import { hoje } from '@/dominio/compartilhado/relogio';
import type { Data } from '@/dominio/compartilhado/tipos';
import { calcularBurndown, type PontoDoBurndown } from '@/dominio/metricas/burndown';
import { calcularProgresso, type ProgressoDoProjeto } from '@/dominio/metricas/progresso';
import { velocityMedia } from '@/dominio/metricas/velocity';
import type { StatusProjeto } from '@/dominio/projetos/projeto';
import { avisosDeSobrecarga, type AvisoDeSobrecarga } from '@/dominio/recursos/carga';
import { diasUteisRestantes } from '@/dominio/sprints/calendario';
import type { SituacaoSprint } from '@/dominio/sprints/sprint';
import { ErroNaoEncontrado } from '../erros';
import type {
  RepositorioAlocacoes,
  RepositorioFeriados,
  RepositorioHistorico,
  RepositorioItens,
  RepositorioPessoas,
  RepositorioProjetos,
  RepositorioSprints,
} from '../portas';

export interface DependenciasDeMetricas {
  projetos: RepositorioProjetos;
  sprints: RepositorioSprints;
  itens: RepositorioItens;
  historico: RepositorioHistorico;
  feriados: RepositorioFeriados;
  pessoas: RepositorioPessoas;
  alocacoes: RepositorioAlocacoes;
  agora: Relogio;
}

export interface BurndownDaSprint {
  sprintId: string;
  dias: PontoDoBurndown[];
  /** Último ponto real (hoje, ou o fim da sprint encerrada); null se a sprint ainda não começou. */
  restante: number | null;
  escopo: number | null;
}

export interface VelocityDoProjeto {
  /** Sprints encerradas, da primeira para a última. A velocity é do projeto, nunca da pessoa (RN-09). */
  sprints: { sprintId: string; numero: number; velocity: number }[];
  /** Média das até 3 últimas; null sem nenhuma sprint encerrada. */
  media: number | null;
}

export interface ProjetoNoPortfolio {
  id: string;
  nome: string;
  status: StatusProjeto;
  inicio: Data;
  fimPrevisto: Data;
  progresso: ProgressoDoProjeto;
  sprintAtual: {
    id: string;
    numero: number;
    inicio: Data;
    fim: Data;
    diasUteisRestantes: number;
  } | null;
  /** Para a linha do tempo: todas as sprints do projeto. */
  sprints: { id: string; numero: number; inicio: Data; fim: Data; situacao: SituacaoSprint }[];
  alertas: {
    itensImpedidos: number;
    /** RN-08: pessoas alocadas ao projeto que passam de 100% em algum dia do projeto. */
    sobrecarga: AvisoDeSobrecarga[];
  };
}

export interface Portfolio {
  /** "Hoje" segundo o relógio do app, para a linha do tempo marcar o dia. */
  hoje: Data;
  projetos: ProjetoNoPortfolio[];
}

export function criarCasosDeUsoDeMetricas({
  projetos,
  sprints,
  itens,
  historico,
  feriados,
  pessoas,
  alocacoes,
  agora,
}: DependenciasDeMetricas) {
  async function projeto(id: string) {
    const encontrado = await projetos.obter(id);
    if (!encontrado) throw new ErroNaoEncontrado('Projeto', id);
    return encontrado;
  }

  const datasDeFeriado = async () => (await feriados.listar()).map((feriado) => feriado.data);

  return {
    /** Série do burndown, reconstruída do histórico de estados (seção 4). */
    async burndown(sprintId: string): Promise<BurndownDaSprint> {
      const sprint = await sprints.obter(sprintId);
      if (!sprint) throw new ErroNaoEncontrado('Sprint', sprintId);

      const registros: HistoricoEstado[] = [];
      for (const { itemId } of sprint.itens)
        registros.push(...(await historico.listarPorItem(itemId)));

      const dias = calcularBurndown({
        sprint,
        historico: registros,
        feriados: await datasDeFeriado(),
        hoje: hoje(agora),
      });
      const ultimoReal = dias.filter((ponto) => ponto.restante !== null).at(-1);
      return {
        sprintId,
        dias,
        restante: ultimoReal?.restante ?? null,
        escopo: ultimoReal?.escopo ?? null,
      };
    },

    async velocity(projetoId: string): Promise<VelocityDoProjeto> {
      await projeto(projetoId);
      const todas = await sprints.listarPorProjeto(projetoId);
      return {
        sprints: todas.flatMap((sprint) =>
          sprint.situacao === 'encerrada' && sprint.velocity !== null
            ? [{ sprintId: sprint.id, numero: sprint.numero, velocity: sprint.velocity }]
            : [],
        ),
        media: velocityMedia(todas),
      };
    },

    /** RN-11. */
    async progresso(projetoId: string): Promise<ProgressoDoProjeto> {
      await projeto(projetoId);
      return calcularProgresso(await itens.listarPorProjeto(projetoId));
    },

    /** Visão macro: todos os projetos, para o Painel (lista e linha do tempo). */
    async portfolio(): Promise<Portfolio> {
      const hojeData = hoje(agora);
      const datas = await datasDeFeriado();
      const todasAsPessoas = await pessoas.listar();
      const todasAsAlocacoes = await alocacoes.listar();

      const lista = (await projetos.listar()).sort(
        (a, b) => a.inicio.localeCompare(b.inicio) || a.nome.localeCompare(b.nome, 'pt-BR'),
      );

      const resultado: ProjetoNoPortfolio[] = [];
      for (const dados of lista) {
        const itensDoProjeto = await itens.listarPorProjeto(dados.id);
        const sprintsDoProjeto = await sprints.listarPorProjeto(dados.id);
        const ativa = sprintsDoProjeto.find((sprint) => sprint.situacao === 'ativa');

        const alocadas = new Set(
          todasAsAlocacoes.filter((a) => a.projetoId === dados.id).map((a) => a.pessoaId),
        );
        const sobrecarga = todasAsPessoas
          .filter((pessoa) => alocadas.has(pessoa.id))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
          .flatMap((pessoa) =>
            avisosDeSobrecarga(
              pessoa,
              todasAsAlocacoes.filter((a) => a.pessoaId === pessoa.id),
              dados.inicio,
              dados.fimPrevisto,
            ),
          );

        resultado.push({
          id: dados.id,
          nome: dados.nome,
          status: dados.status,
          inicio: dados.inicio,
          fimPrevisto: dados.fimPrevisto,
          progresso: calcularProgresso(itensDoProjeto),
          sprintAtual: ativa
            ? {
                id: ativa.id,
                numero: ativa.numero,
                inicio: ativa.inicio,
                fim: ativa.fim,
                diasUteisRestantes: diasUteisRestantes(ativa, hojeData, datas),
              }
            : null,
          sprints: sprintsDoProjeto.map(({ id, numero, inicio, fim, situacao }) => ({
            id,
            numero,
            inicio,
            fim,
            situacao,
          })),
          alertas: {
            itensImpedidos: itensDoProjeto.filter((item) => item.impedido !== null).length,
            sobrecarga,
          },
        });
      }
      return { hoje: hojeData, projetos: resultado };
    },
  };
}

export type CasosDeUsoDeMetricas = ReturnType<typeof criarCasosDeUsoDeMetricas>;
