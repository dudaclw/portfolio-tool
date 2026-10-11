import type { HistoricoEstado, ItemBacklog } from '../backlog/item-backlog';
import { compararDatas, ehDataValida } from '../compartilhado/datas';
import { ErroDeRegra } from '../compartilhado/erro-de-regra';
import { ErroDeValidacao, type ProblemaDeCampo } from '../compartilhado/erro-de-validacao';
import type { Data, Instante } from '../compartilhado/tipos';
import { calcularFimDaSprint } from './calendario';

export interface ItemNaSprint {
  itemId: string;
  estimativaPlanejada: number;
  adicionadoEm: Instante;
  resultado: 'aceito' | 'nao_aceito' | null;
  feedbackReview?: string;
}

export interface AcaoRetro {
  id: string;
  descricao: string;
  responsavelId?: string;
  prazo?: Data;
  concluida: boolean;
}

export const SITUACOES_DA_SPRINT = ['planejada', 'ativa', 'encerrada'] as const;

export type SituacaoSprint = (typeof SITUACOES_DA_SPRINT)[number];

export interface Sprint {
  id: string;
  projetoId: string;
  numero: number;
  inicio: Data;
  fim: Data;
  meta: string;
  situacao: SituacaoSprint;
  itens: ItemNaSprint[];
  velocity: number | null;
  retrospectiva?: { bem: string[]; melhorar: string[]; acoes: AcaoRetro[] };
}

/** Nova sprint: planejada, sem meta e sem itens; o fim vem da duração (seção 4). */
export function criarSprint(
  id: string,
  projetoId: string,
  numero: number,
  inicio: Data,
  duracaoSprintDias: number,
): Sprint {
  if (!ehDataValida(inicio)) {
    throw new ErroDeValidacao([
      { campo: 'inicio', mensagem: 'Data de início inválida. Use AAAA-MM-DD.' },
    ]);
  }
  return {
    id,
    projetoId,
    numero,
    inicio,
    fim: calcularFimDaSprint(inicio, duracaoSprintDias),
    meta: '',
    situacao: 'planejada',
    itens: [],
    velocity: null,
  };
}

/**
 * RN-01: depois que a sprint inicia, suas datas não mudam. Enquanto planejada, aceita novas datas
 * (o fim não pode ser anterior ao início).
 */
export function alterarDatasDaSprint(
  sprint: Sprint,
  alteracoes: { inicio?: Data; fim?: Data },
): Sprint {
  if (sprint.situacao !== 'planejada') {
    throw new ErroDeRegra('RN-01', 'As datas da sprint não mudam depois que ela inicia.');
  }
  const inicio = alteracoes.inicio ?? sprint.inicio;
  const fim = alteracoes.fim ?? sprint.fim;

  const problemas: ProblemaDeCampo[] = [];
  if (!ehDataValida(inicio)) {
    problemas.push({ campo: 'inicio', mensagem: 'Data de início inválida. Use AAAA-MM-DD.' });
  }
  if (!ehDataValida(fim)) {
    problemas.push({ campo: 'fim', mensagem: 'Data de fim inválida. Use AAAA-MM-DD.' });
  }
  if (problemas.length === 0 && compararDatas(fim, inicio) < 0) {
    problemas.push({ campo: 'fim', mensagem: 'O fim da sprint não pode ser anterior ao início.' });
  }
  if (problemas.length > 0) throw new ErroDeValidacao(problemas);

  return { ...sprint, inicio, fim };
}

export interface ResultadoDoPlanejamento {
  sprint: Sprint;
  /** Itens que entraram na sprint ou saíram dela, já com `sprintId` e estado novos. */
  itensAlterados: ItemBacklog[];
  /** Registros de histórico dos itens que saíram e voltaram a `pronto_para_sprint`. */
  historico: HistoricoEstado[];
}

/**
 * Define a meta e os itens da sprint (`itemIds` é o conjunto completo desejado).
 *
 * - RN-03: com a sprint ativa a meta não muda; os itens podem entrar e sair.
 * - RN-10: só entra item em `pronto_para_sprint` (quem já está na sprint não é revalidado).
 * - Item que sai volta ao backlog em `pronto_para_sprint` (como na RN-05), com histórico.
 * - Sprint encerrada não é mais planejada.
 */
export function planejarSprint(
  sprint: Sprint,
  itensDoProjeto: readonly ItemBacklog[],
  meta: string,
  itemIds: readonly string[],
  agora: Instante,
): ResultadoDoPlanejamento {
  if (sprint.situacao === 'encerrada') {
    throw new ErroDeRegra('SPRINT-ENCERRADA', 'Uma sprint encerrada não pode mais ser alterada.');
  }
  const metaLimpa = meta.trim();
  if (sprint.situacao === 'ativa' && metaLimpa !== sprint.meta) {
    throw new ErroDeRegra(
      'RN-03',
      'A meta não muda com a sprint ativa. Os itens podem entrar e sair.',
    );
  }

  const desejados = [...new Set(itemIds)];
  const porId = new Map(itensDoProjeto.map((item) => [item.id, item]));
  const desconhecidos = desejados.filter((id) => !porId.has(id));
  if (desconhecidos.length > 0) {
    throw new ErroDeValidacao([
      { campo: 'itemIds', mensagem: 'Há itens que não existem neste projeto.' },
    ]);
  }

  const jaNaSprint = new Set(sprint.itens.map((item) => item.itemId));
  const entram = desejados.filter((id) => !jaNaSprint.has(id)).map((id) => porId.get(id)!);

  for (const item of entram) {
    if (item.sprintId !== null) {
      throw new ErroDeRegra('ITEM-EM-SPRINT', `O item "${item.titulo}" já está em outra sprint.`);
    }
    if (item.estado !== 'pronto_para_sprint') {
      throw new ErroDeRegra(
        'RN-10',
        `O item "${item.titulo}" não está pronto para sprint. Só itens em "Pronto para sprint" entram em uma sprint.`,
      );
    }
  }

  const alterados: ItemBacklog[] = entram.map((item) => ({ ...item, sprintId: sprint.id }));
  const historico: HistoricoEstado[] = [];
  const saem = sprint.itens.filter((item) => !desejados.includes(item.itemId));
  for (const { itemId } of saem) {
    const item = porId.get(itemId);
    if (!item) continue;
    if (item.estado !== 'pronto_para_sprint') {
      historico.push({ itemId, de: item.estado, para: 'pronto_para_sprint', em: agora });
    }
    alterados.push({ ...item, sprintId: null, estado: 'pronto_para_sprint' });
  }

  const mantidos = sprint.itens.filter((item) => desejados.includes(item.itemId));
  const novos: ItemNaSprint[] = entram.map((item) => ({
    itemId: item.id,
    // Item sem estimativa entra valendo 0 ponto (a tela do backlog já mostra quantos faltam).
    estimativaPlanejada: item.estimativa ?? 0,
    adicionadoEm: agora,
    resultado: null,
  }));

  return {
    sprint: { ...sprint, meta: metaLimpa, itens: [...mantidos, ...novos] },
    itensAlterados: alterados,
    historico,
  };
}

/**
 * Torna a sprint ativa. A ordem das checagens importa: primeiro RN-02 (uma ativa por projeto),
 * depois RN-10 (meta e itens).
 */
export function iniciarSprint(sprint: Sprint, outrasDoProjeto: readonly Sprint[]): Sprint {
  if (sprint.situacao !== 'planejada') {
    throw new ErroDeRegra('SPRINT-NAO-PLANEJADA', 'Só uma sprint planejada pode ser iniciada.');
  }
  const ativa = outrasDoProjeto.find(
    (outra) => outra.id !== sprint.id && outra.situacao === 'ativa',
  );
  if (ativa) {
    throw new ErroDeRegra(
      'RN-02',
      `A sprint ${ativa.numero} já está ativa neste projeto. Encerre-a antes de iniciar outra.`,
    );
  }
  if (sprint.meta.trim().length === 0) {
    throw new ErroDeRegra('RN-10', 'Defina a meta da sprint antes de iniciá-la.');
  }
  if (sprint.itens.length === 0) {
    throw new ErroDeRegra('RN-10', 'Escolha ao menos um item para a sprint antes de iniciá-la.');
  }
  return { ...sprint, situacao: 'ativa' };
}
