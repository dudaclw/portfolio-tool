import { hoje, type Relogio } from '@/dominio/compartilhado/relogio';
import type { Data } from '@/dominio/compartilhado/tipos';
import type { Projeto } from '@/dominio/projetos/projeto';
import { diasUteisRestantes, inicioPadraoDaSprint } from '@/dominio/sprints/calendario';
import { encerrarSprint } from '@/dominio/sprints/encerramento';
import { ErroDeValidacao } from '@/dominio/compartilhado/erro-de-validacao';
import {
  registrarRetrospectiva,
  type EntradaDeRetrospectiva,
} from '@/dominio/sprints/retrospectiva';
import { registrarReview, type ResultadoDeReview } from '@/dominio/sprints/review';
import {
  alterarDatasDaSprint,
  criarSprint,
  iniciarSprint,
  planejarSprint,
  type Sprint,
} from '@/dominio/sprints/sprint';
import { ErroNaoEncontrado } from '../erros';
import type {
  RepositorioFeriados,
  RepositorioHistorico,
  RepositorioItens,
  RepositorioPessoas,
  RepositorioProjetos,
  RepositorioSprints,
  Transacao,
} from '../portas';

export interface DependenciasDeSprints {
  projetos: RepositorioProjetos;
  pessoas: RepositorioPessoas;
  sprints: RepositorioSprints;
  itens: RepositorioItens;
  historico: RepositorioHistorico;
  feriados: RepositorioFeriados;
  transacao: Transacao;
  agora: Relogio;
  gerarId: () => string;
}

export interface SprintDetalhada extends Sprint {
  /** Só para sprint ativa; nas demais, null. */
  diasUteisRestantes: number | null;
}

export interface EntradaDeSprint {
  /** Padrão: o dia seguinte ao fim da sprint anterior (ou o início do projeto). */
  inicio?: Data;
}

export interface PlanejamentoDaSprint {
  meta: string;
  itemIds: string[];
}

export function criarCasosDeUsoDeSprints({
  projetos,
  pessoas,
  sprints,
  itens,
  historico,
  feriados,
  transacao,
  agora,
  gerarId,
}: DependenciasDeSprints) {
  async function projeto(id: string): Promise<Projeto> {
    const encontrado = await projetos.obter(id);
    if (!encontrado) throw new ErroNaoEncontrado('Projeto', id);
    return encontrado;
  }

  async function sprint(id: string): Promise<Sprint> {
    const encontrada = await sprints.obter(id);
    if (!encontrada) throw new ErroNaoEncontrado('Sprint', id);
    return encontrada;
  }

  return {
    async listarPorProjeto(projetoId: string): Promise<Sprint[]> {
      await projeto(projetoId);
      return sprints.listarPorProjeto(projetoId);
    },

    async obter(id: string): Promise<SprintDetalhada> {
      const encontrada = await sprint(id);
      if (encontrada.situacao !== 'ativa') return { ...encontrada, diasUteisRestantes: null };
      const datas = (await feriados.listar()).map((feriado) => feriado.data);
      return {
        ...encontrada,
        diasUteisRestantes: diasUteisRestantes(encontrada, hoje(agora), datas),
      };
    },

    /** Datas pela duração do projeto (seção 4); a nova sprint nasce planejada. */
    async criar(projetoId: string, entrada: EntradaDeSprint = {}): Promise<Sprint> {
      const { duracaoSprintDias, inicio: inicioDoProjeto } = await projeto(projetoId);
      return transacao.executar(async () => {
        const existentes = await sprints.listarPorProjeto(projetoId);
        const anterior = existentes.at(-1);
        const criada = criarSprint(
          gerarId(),
          projetoId,
          (anterior?.numero ?? 0) + 1,
          entrada.inicio ?? inicioPadraoDaSprint(inicioDoProjeto, anterior?.fim ?? null),
          duracaoSprintDias,
        );
        await sprints.salvar(criada);
        return criada;
      });
    },

    /** RN-01: só enquanto a sprint está planejada. */
    async alterarDatas(id: string, alteracoes: { inicio?: Data; fim?: Data }): Promise<Sprint> {
      return transacao.executar(async () => {
        const atualizada = alterarDatasDaSprint(await sprint(id), alteracoes);
        await sprints.salvar(atualizada);
        return atualizada;
      });
    },

    /** Define meta e itens (RN-03, RN-10). Itens que entram ou saem mudam na mesma transação. */
    async planejar(id: string, { meta, itemIds }: PlanejamentoDaSprint): Promise<Sprint> {
      return transacao.executar(async () => {
        const atual = await sprint(id);
        const doProjeto = await itens.listarPorProjeto(atual.projetoId);
        const resultado = planejarSprint(atual, doProjeto, meta, itemIds, agora());
        for (const item of resultado.itensAlterados) await itens.salvar(item);
        for (const registro of resultado.historico) await historico.adicionar(registro);
        await sprints.salvar(resultado.sprint);
        return resultado.sprint;
      });
    },

    /** RN-02 (uma ativa por projeto) e RN-10 (meta e itens). */
    async iniciar(id: string): Promise<Sprint> {
      return transacao.executar(async () => {
        const atual = await sprint(id);
        const doProjeto = await sprints.listarPorProjeto(atual.projetoId);
        const iniciada = iniciarSprint(atual, doProjeto);
        await sprints.salvar(iniciada);
        return iniciada;
      });
    },

    /** Aceite por item (só com a sprint ativa). */
    async registrarReview(id: string, resultados: ResultadoDeReview[]): Promise<Sprint> {
      return transacao.executar(async () => {
        const atual = await sprint(id);
        const doProjeto = await itens.listarPorProjeto(atual.projetoId);
        const atualizada = registrarReview(atual, doProjeto, resultados);
        await sprints.salvar(atualizada);
        return atualizada;
      });
    },

    /** Substitui a retrospectiva da sprint (ativa ou encerrada). */
    async salvarRetrospectiva(id: string, entrada: EntradaDeRetrospectiva): Promise<Sprint> {
      return transacao.executar(async () => {
        const atual = await sprint(id);
        for (const [indice, acao] of entrada.acoes.entries()) {
          if (acao.responsavelId && !(await pessoas.obter(acao.responsavelId))) {
            throw new ErroDeValidacao([
              {
                campo: `acoes.${indice}.responsavelId`,
                mensagem: 'Essa pessoa não está cadastrada.',
              },
            ]);
          }
        }
        const atualizada = registrarRetrospectiva(atual, entrada, gerarId);
        await sprints.salvar(atualizada);
        return atualizada;
      });
    },

    /**
     * RN-05 e RN-06, tudo ou nada: a sprint, os itens devolvidos ao backlog (com a nova ordem) e
     * o histórico são gravados na mesma transação; se algo falhar, nada muda.
     */
    async encerrar(id: string): Promise<Sprint> {
      return transacao.executar(async () => {
        const atual = await sprint(id);
        const doProjeto = await itens.listarPorProjeto(atual.projetoId);
        const resultado = encerrarSprint(atual, doProjeto, agora());
        for (const item of resultado.itensAlterados) await itens.salvar(item);
        for (const registro of resultado.historico) await historico.adicionar(registro);
        await sprints.salvar(resultado.sprint);
        return resultado.sprint;
      });
    },
  };
}

export type CasosDeUsoDeSprints = ReturnType<typeof criarCasosDeUsoDeSprints>;
