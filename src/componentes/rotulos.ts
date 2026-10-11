import type { EstadoItem, TipoItem } from '@/dominio/backlog/item-backlog';
import type { StatusProjeto } from '@/dominio/projetos/projeto';

export const ROTULO_DO_STATUS: Record<StatusProjeto, string> = {
  planejado: 'Planejado',
  em_andamento: 'Em andamento',
  pausado: 'Pausado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

/** '2026-09-14' → '14/09/2026'. */
export function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

export const ROTULO_DO_TIPO: Record<TipoItem, string> = {
  historia: 'História',
  tarefa: 'Tarefa',
  bug: 'Bug',
  debito_tecnico: 'Débito técnico',
};

export const ROTULO_DO_ESTADO: Record<EstadoItem, string> = {
  novo: 'Novo',
  refinado: 'Refinado',
  pronto_para_sprint: 'Pronto para sprint',
  em_andamento: 'Em andamento',
  em_revisao: 'Em revisão',
  concluido: 'Concluído',
};

/** '2026-10-09T12:00:00Z' → '09/10/2026' (a data UTC do instante, como o resto do app). */
export function formatarInstante(instante: string): string {
  return formatarData(instante.slice(0, 10));
}
