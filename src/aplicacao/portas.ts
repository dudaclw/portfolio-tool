import type { HistoricoEstado, ItemBacklog } from '@/dominio/backlog/item-backlog';
import type { Projeto } from '@/dominio/projetos/projeto';
import type { Alocacao, Ausencia, Feriado, Pessoa } from '@/dominio/recursos/recursos';
import type { Sprint } from '@/dominio/sprints/sprint';

/**
 * Portas de persistência. Todos os métodos são assíncronos desde já, mesmo que o armazenamento
 * atual seja um arquivo, para que ele possa ser trocado sem mudar quem chama.
 */
export interface Repositorio<T extends { id: string }> {
  listar(): Promise<T[]>;
  obter(id: string): Promise<T | null>;
  /** Cria ou substitui. */
  salvar(entidade: T): Promise<void>;
  remover(id: string): Promise<void>;
}

export interface Transacao {
  /** Tudo ou nada: se o trabalho lançar erro, nada do que ele alterou é mantido. */
  executar<R>(trabalho: () => Promise<R>): Promise<R>;
}

export type RepositorioProjetos = Repositorio<Projeto>;
export type RepositorioPessoas = Repositorio<Pessoa>;

export interface RepositorioItens extends Repositorio<ItemBacklog> {
  /** Todos os itens do projeto, na ordem do backlog. */
  listarPorProjeto(projetoId: string): Promise<ItemBacklog[]>;
}

/** O histórico só cresce: registros são acrescentados, nunca editados. */
export interface RepositorioHistorico {
  /** Em ordem cronológica (a ordem em que foram registrados). */
  listarPorItem(itemId: string): Promise<HistoricoEstado[]>;
  adicionar(registro: HistoricoEstado): Promise<void>;
  /** Usado quando o item é removido. */
  removerDoItem(itemId: string): Promise<void>;
}

export interface RepositorioSprints extends Repositorio<Sprint> {
  /** Sprints do projeto, da primeira para a última (por número). */
  listarPorProjeto(projetoId: string): Promise<Sprint[]>;
}

export interface RepositorioFeriados {
  /** Todos os feriados cadastrados, em ordem de data. */
  listar(): Promise<Feriado[]>;
  obter(data: string): Promise<Feriado | null>;
  /** Cria ou substitui (a data é a chave). */
  salvar(feriado: Feriado): Promise<void>;
  remover(data: string): Promise<void>;
}

export type RepositorioAlocacoes = Repositorio<Alocacao>;
export type RepositorioAusencias = Repositorio<Ausencia>;
