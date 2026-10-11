import type { EstadoItem, HistoricoEstado } from '../backlog/item-backlog';
import { compararDatas, diasUteis } from '../compartilhado/datas';
import { dataDoInstante } from '../compartilhado/relogio';
import type { Data } from '../compartilhado/tipos';
import type { Sprint } from '../sprints/sprint';

export interface PontoDoBurndown {
  /** Dia útil da sprint. */
  data: Data;
  /** Linha ideal: desce linearmente do escopo inicial até 0 no último dia útil. */
  ideal: number;
  /** Pontos planejados dos itens que já estavam na sprint ao fim do dia; null depois de "hoje". */
  escopo: number | null;
  /** Pontos desses itens que ainda não estavam concluídos ao fim do dia; null depois de "hoje". */
  restante: number | null;
}

export interface EntradaDoBurndown {
  sprint: Pick<Sprint, 'inicio' | 'fim' | 'situacao' | 'itens'>;
  /** Histórico de estados dos itens da sprint (de outros itens, tanto faz). */
  historico: readonly HistoricoEstado[];
  feriados: Iterable<Data>;
  hoje: Data;
}

const arredondar = (valor: number) => Math.round(valor * 100) / 100;

/**
 * Burndown calculado do histórico, sem foto diária (agent.md, seção 4).
 *
 * Para cada dia útil D da sprint até hoje (até o fim, se encerrada):
 * - escopo(D) = soma da estimativa planejada dos itens adicionados até D;
 * - restante(D) = soma, entre esses, dos que ao fim de D não estavam em `concluido`, segundo o
 *   último registro de histórico até D (item sem registro até D conta como não concluído).
 * Dias não úteis não geram ponto. Depois do limite, `escopo` e `restante` vêm null e só a
 * linha ideal continua, para o gráfico mostrar a sprint inteira.
 */
export function calcularBurndown({
  sprint,
  historico,
  feriados,
  hoje,
}: EntradaDoBurndown): PontoDoBurndown[] {
  const dias = diasUteis(sprint.inicio, sprint.fim, feriados);
  if (dias.length === 0) return [];

  // Sprint encerrada mostra tudo. Sprint iniciada sempre mostra pelo menos o primeiro dia, mesmo que
  // tenha sido iniciada antes da data de início (o gráfico "começa no escopo planejado"). Sprint
  // ainda planejada não começou: só a linha ideal.
  const planejada = sprint.situacao === 'planejada';
  const limite =
    sprint.situacao === 'encerrada'
      ? sprint.fim
      : compararDatas(hoje, dias[0]!) < 0
        ? dias[0]!
        : hoje;

  const porItem = new Map<string, HistoricoEstado[]>();
  for (const registro of historico) {
    const lista = porItem.get(registro.itemId) ?? [];
    lista.push(registro);
    porItem.set(registro.itemId, lista);
  }
  // Ordem cronológica estável: instantes iguais mantêm a ordem em que foram gravados.
  for (const lista of porItem.values()) lista.sort((a, b) => a.em.localeCompare(b.em));

  const estadoAoFimDe = (itemId: string, dia: Data): EstadoItem | null => {
    let estado: EstadoItem | null = null;
    for (const registro of porItem.get(itemId) ?? []) {
      if (compararDatas(dataDoInstante(registro.em), dia) > 0) break;
      estado = registro.para;
    }
    return estado;
  };

  const escopoEm = (dia: Data) =>
    sprint.itens.filter((item) => compararDatas(dataDoInstante(item.adicionadoEm), dia) <= 0);

  const escopoInicial = escopoEm(dias[0]!).reduce(
    (soma, item) => soma + item.estimativaPlanejada,
    0,
  );

  return dias.map((data, indice): PontoDoBurndown => {
    const ideal =
      dias.length === 1
        ? 0
        : arredondar((escopoInicial * (dias.length - 1 - indice)) / (dias.length - 1));
    if (planejada || compararDatas(data, limite) > 0)
      return { data, ideal, escopo: null, restante: null };

    const naSprint = escopoEm(data);
    return {
      data,
      ideal,
      escopo: naSprint.reduce((soma, item) => soma + item.estimativaPlanejada, 0),
      restante: naSprint
        .filter((item) => estadoAoFimDe(item.itemId, data) !== 'concluido')
        .reduce((soma, item) => soma + item.estimativaPlanejada, 0),
    };
  });
}
