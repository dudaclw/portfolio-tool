import type { ItemNaSprint, Sprint } from '../sprints/sprint';

type SprintParaVelocity = Pick<Sprint, 'numero' | 'situacao' | 'velocity'>;

/**
 * Velocity média das últimas sprints encerradas (até 3). Com menos de 3 usa as disponíveis; sem
 * nenhuma, devolve null ("sem dados"). A velocity é do projeto, nunca da pessoa (RN-09).
 */
export function velocityMedia(
  sprints: readonly SprintParaVelocity[],
  quantidade = 3,
): number | null {
  const ultimas = sprints
    .filter((sprint) => sprint.situacao === 'encerrada' && sprint.velocity !== null)
    .sort((a, b) => b.numero - a.numero)
    .slice(0, quantidade);
  if (ultimas.length === 0) return null;
  return ultimas.reduce((soma, sprint) => soma + (sprint.velocity ?? 0), 0) / ultimas.length;
}

/** Os pontos escolhidos passam da velocity média? Sem média ainda, não há como comparar. */
export function passaDaVelocityMedia(pontos: number, media: number | null): boolean {
  return media !== null && pontos > media;
}

/**
 * RN-06: velocity = soma da estimativa planejada dos itens aceitos. Usa o valor de quando o item
 * entrou na sprint, então reestimar o item depois não altera a velocity.
 */
export function calcularVelocity(itens: readonly ItemNaSprint[]): number {
  return itens
    .filter((item) => item.resultado === 'aceito')
    .reduce((soma, item) => soma + item.estimativaPlanejada, 0);
}
