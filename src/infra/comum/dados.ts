import type { HistoricoEstado, ItemBacklog } from '@/dominio/backlog/item-backlog';
import type { Projeto } from '@/dominio/projetos/projeto';
import type { Alocacao, Ausencia, Feriado, Pessoa } from '@/dominio/recursos/recursos';
import type { Sprint } from '@/dominio/sprints/sprint';

export const VERSAO_DO_ESQUEMA = 1;

/** Forma do arquivo de dados (data/dados.json). */
export interface Dados {
  versaoEsquema: typeof VERSAO_DO_ESQUEMA;
  projetos: Projeto[];
  itens: ItemBacklog[];
  historico: HistoricoEstado[];
  sprints: Sprint[];
  pessoas: Pessoa[];
  alocacoes: Alocacao[];
  ausencias: Ausencia[];
  feriados: Feriado[];
}

/** Coleções cujos elementos têm `id` (as que um Repositorio<T> genérico atende). */
export type ColecaoComId = {
  [K in keyof Dados]: Dados[K] extends { id: string }[] ? K : never;
}[keyof Dados];

export function dadosVazios(): Dados {
  return {
    versaoEsquema: VERSAO_DO_ESQUEMA,
    projetos: [],
    itens: [],
    historico: [],
    sprints: [],
    pessoas: [],
    alocacoes: [],
    ausencias: [],
    feriados: [],
  };
}

const COLECOES: readonly (keyof Dados)[] = [
  'projetos',
  'itens',
  'historico',
  'sprints',
  'pessoas',
  'alocacoes',
  'ausencias',
  'feriados',
];

/** Valida o conteúdo lido do disco; lança Error com mensagem clara se não for um Dados. */
export function lerDados(texto: string, origem: string): Dados {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new Error(
      `O arquivo de dados "${origem}" não é um JSON válido. Restaure um backup ou rode npm run seed.`,
    );
  }
  if (typeof bruto !== 'object' || bruto === null) {
    throw new Error(`O arquivo de dados "${origem}" tem formato inesperado.`);
  }
  const candidato = bruto as Record<string, unknown>;
  if (candidato.versaoEsquema !== VERSAO_DO_ESQUEMA) {
    throw new Error(
      `O arquivo de dados "${origem}" tem versaoEsquema ${String(candidato.versaoEsquema)}; este app entende a versão ${VERSAO_DO_ESQUEMA}.`,
    );
  }
  for (const colecao of COLECOES) {
    if (!Array.isArray(candidato[colecao])) {
      throw new Error(`O arquivo de dados "${origem}" não tem a coleção "${colecao}".`);
    }
  }
  return candidato as unknown as Dados;
}
