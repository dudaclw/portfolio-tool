import { ErroDeValidacao, type ProblemaDeCampo } from '../compartilhado/erro-de-validacao';
import type { Instante } from '../compartilhado/tipos';

export const ESTADOS_DE_ITEM = [
  'novo',
  'refinado',
  'pronto_para_sprint',
  'em_andamento',
  'em_revisao',
  'concluido',
] as const;

export type EstadoItem = (typeof ESTADOS_DE_ITEM)[number];

export const TIPOS_DE_ITEM = ['historia', 'tarefa', 'bug', 'debito_tecnico'] as const;

export type TipoItem = (typeof TIPOS_DE_ITEM)[number];

export const ESCALA_DE_ESTIMATIVA = [1, 2, 3, 5, 8, 13, 21] as const;

export interface ItemBacklog {
  id: string;
  projetoId: string;
  tipo: TipoItem;
  titulo: string;
  descricao: string;
  criteriosAceite: string;
  /** 1, 2, 3, 5, 8, 13 ou 21. */
  estimativa: number | null;
  /** Posição inteira no backlog. */
  ordem: number;
  estado: EstadoItem;
  responsavelId: string | null;
  impedido: { motivo: string; desde: Instante } | null;
  /** Itens da Definição de Pronto cumpridos. */
  dodMarcados: string[];
  sprintId: string | null;
}

export interface HistoricoEstado {
  itemId: string;
  de: EstadoItem | null;
  para: EstadoItem;
  em: Instante;
}

export interface EntradaDeItem {
  /** Padrão: história. */
  tipo?: TipoItem;
  titulo: string;
  descricao?: string;
  criteriosAceite?: string;
  estimativa?: number | null;
  responsavelId?: string | null;
}

/** Campos que o usuário edita no item; estado, ordem, impedimento e Definição de Pronto têm ações próprias. */
export type AlteracoesDoItem = Partial<
  Pick<
    ItemBacklog,
    'tipo' | 'titulo' | 'descricao' | 'criteriosAceite' | 'estimativa' | 'responsavelId'
  >
>;

type CamposEditaveis = Required<AlteracoesDoItem>;

function validar(dados: CamposEditaveis): void {
  const problemas: ProblemaDeCampo[] = [];

  if (dados.titulo.length === 0) {
    problemas.push({ campo: 'titulo', mensagem: 'Informe o título do item.' });
  }
  if (!TIPOS_DE_ITEM.includes(dados.tipo)) {
    problemas.push({
      campo: 'tipo',
      mensagem: 'Tipo inválido. Use história, tarefa, bug ou débito técnico.',
    });
  }
  if (
    dados.estimativa !== null &&
    !(ESCALA_DE_ESTIMATIVA as readonly number[]).includes(dados.estimativa)
  ) {
    problemas.push({
      campo: 'estimativa',
      mensagem: `A estimativa deve ser ${ESCALA_DE_ESTIMATIVA.join(', ')} ou ficar em branco.`,
    });
  }

  if (problemas.length > 0) throw new ErroDeValidacao(problemas);
}

function normalizar(dados: CamposEditaveis): CamposEditaveis {
  return {
    tipo: dados.tipo,
    titulo: dados.titulo.trim(),
    descricao: dados.descricao.trim(),
    criteriosAceite: dados.criteriosAceite.trim(),
    estimativa: dados.estimativa,
    responsavelId: dados.responsavelId,
  };
}

/** Cria um item novo, no estado `novo`, fora de sprint. Lança ErroDeValidacao se algo for inválido. */
export function criarItem(
  id: string,
  projetoId: string,
  entrada: EntradaDeItem,
  ordem: number,
): ItemBacklog {
  const campos = normalizar({
    tipo: entrada.tipo ?? 'historia',
    titulo: entrada.titulo,
    descricao: entrada.descricao ?? '',
    criteriosAceite: entrada.criteriosAceite ?? '',
    estimativa: entrada.estimativa ?? null,
    responsavelId: entrada.responsavelId ?? null,
  });
  validar(campos);
  return {
    id,
    projetoId,
    ...campos,
    ordem,
    estado: 'novo',
    impedido: null,
    dodMarcados: [],
    sprintId: null,
  };
}

/** Aplica alterações aos campos editáveis e revalida o resultado. */
export function alterarItem(item: ItemBacklog, alteracoes: AlteracoesDoItem): ItemBacklog {
  const campos = normalizar({
    tipo: alteracoes.tipo ?? item.tipo,
    titulo: alteracoes.titulo ?? item.titulo,
    descricao: alteracoes.descricao ?? item.descricao,
    criteriosAceite: alteracoes.criteriosAceite ?? item.criteriosAceite,
    // `undefined` é "não mexer"; `null` é "limpar".
    estimativa: alteracoes.estimativa === undefined ? item.estimativa : alteracoes.estimativa,
    responsavelId:
      alteracoes.responsavelId === undefined ? item.responsavelId : alteracoes.responsavelId,
  });
  validar(campos);
  return { ...item, ...campos };
}

/** Marca o item como impedido. Se já estava, atualiza o motivo e mantém o "desde". */
export function impedirItem(item: ItemBacklog, motivo: string, agora: Instante): ItemBacklog {
  const limpo = motivo.trim();
  if (limpo.length === 0) {
    throw new ErroDeValidacao([{ campo: 'motivo', mensagem: 'Informe o motivo do impedimento.' }]);
  }
  return { ...item, impedido: { motivo: limpo, desde: item.impedido?.desde ?? agora } };
}

export function liberarItem(item: ItemBacklog): ItemBacklog {
  return { ...item, impedido: null };
}

/**
 * Define quais critérios da Definição de Pronto o item cumpre. Todo critério marcado precisa
 * existir na Definição de Pronto do projeto; repetidos são ignorados e a ordem da Definição vale.
 */
export function marcarCriterios(
  item: ItemBacklog,
  marcados: readonly string[],
  definicaoDePronto: readonly string[],
): ItemBacklog {
  const desconhecidos = marcados.filter((criterio) => !definicaoDePronto.includes(criterio));
  if (desconhecidos.length > 0) {
    throw new ErroDeValidacao([
      {
        campo: 'marcados',
        mensagem: `Critério fora da Definição de Pronto do projeto: ${desconhecidos.map((c) => `"${c}"`).join(', ')}.`,
      },
    ]);
  }
  return {
    ...item,
    dodMarcados: definicaoDePronto.filter((criterio) => marcados.includes(criterio)),
  };
}
