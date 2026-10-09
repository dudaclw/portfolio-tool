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
