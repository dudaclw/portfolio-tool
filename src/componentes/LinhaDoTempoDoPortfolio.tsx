import Link from 'next/link';
import type { Portfolio } from '@/aplicacao/metricas/casos-de-uso';
import { montarLinhaDoTempo } from './linha-do-tempo';
import { ROTULO_DA_SITUACAO_DA_SPRINT, ROTULO_DO_STATUS, formatarData } from './rotulos';

const COR_DA_SPRINT = {
  encerrada: 'bg-slate-500',
  ativa: 'bg-[var(--serie-2)]',
  planejada: 'bg-slate-300',
} as const;

/**
 * Uma barra por projeto, do início ao fim previsto, com as sprints marcadas dentro dela (S1, S2…)
 * e uma linha vertical em "hoje". A lista logo ao lado do botão de alternância traz os mesmos
 * dados em tabela.
 */
export function LinhaDoTempoDoPortfolio({ portfolio }: { portfolio: Portfolio }) {
  const linha = montarLinhaDoTempo(portfolio.projetos, portfolio.hoje);
  if (!linha) {
    return <p className="text-slate-700">Nenhum projeto ainda. Crie o primeiro projeto.</p>;
  }

  return (
    <figure className="space-y-3">
      <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white p-3">
        <div className="min-w-[44rem]">
          <div className="grid grid-cols-[11rem_minmax(0,1fr)] gap-3">
            <div />
            <div className="relative h-9 text-xs text-slate-600" aria-hidden="true">
              {linha.hoje !== null && (
                <span
                  className="absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-red-700 px-1.5 py-0.5 text-[11px] font-medium text-white"
                  style={{ left: `${linha.hoje}%` }}
                >
                  Hoje {formatarData(portfolio.hoje).slice(0, 5)}
                </span>
              )}
              {linha.meses.map((mes) => (
                <span
                  key={mes.rotulo}
                  className="absolute top-5"
                  style={{ left: `${mes.esquerda}%` }}
                >
                  {mes.rotulo}
                </span>
              ))}
            </div>
          </div>

          <ul className="mt-1 space-y-3">
            {linha.linhas.map((projeto) => (
              <li
                key={projeto.id}
                className="grid grid-cols-[11rem_minmax(0,1fr)] items-center gap-3"
              >
                <Link
                  href={`/projetos/${projeto.id}`}
                  className="truncate text-sm font-medium text-blue-800 underline underline-offset-2 hover:text-blue-950"
                >
                  {projeto.nome}
                </Link>
                <div className="relative h-9 rounded bg-slate-100">
                  {linha.hoje !== null && (
                    <div
                      className="absolute inset-y-0 z-10 w-0 border-l-2 border-dashed border-red-700"
                      style={{ left: `${linha.hoje}%` }}
                      aria-hidden="true"
                    />
                  )}
                  <div
                    className="absolute inset-y-0 rounded bg-[var(--serie-1)]/25 ring-1 ring-[var(--serie-1)]"
                    style={{ left: `${projeto.esquerda}%`, width: `${projeto.largura}%` }}
                    role="img"
                    aria-label={`${projeto.nome}: ${formatarData(projeto.inicio)} a ${formatarData(projeto.fimPrevisto)}`}
                  />
                  {projeto.sprints.map((sprint) => (
                    <div
                      key={sprint.numero}
                      className={`absolute top-1/2 flex h-5 -translate-y-1/2 items-center justify-center rounded-sm text-[11px] font-semibold text-white ring-1 ring-white ${COR_DA_SPRINT[sprint.situacao]} ${sprint.situacao === 'planejada' ? '!text-slate-800' : ''}`}
                      style={{ left: `${sprint.esquerda}%`, width: `${sprint.largura}%` }}
                      title={`Sprint ${sprint.numero} · ${ROTULO_DA_SITUACAO_DA_SPRINT[sprint.situacao]} · ${formatarData(sprint.inicio)} a ${formatarData(sprint.fim)}`}
                    >
                      S{sprint.numero}
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700">
        <span>Barra azul: do início ao fim previsto do projeto.</span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded-sm bg-slate-500" /> sprint encerrada
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded-sm bg-[var(--serie-2)]" /> sprint ativa
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded-sm bg-slate-300" /> sprint planejada
        </span>
        <span>
          Projetos:{' '}
          {portfolio.projetos.map((p) => `${p.nome} (${ROTULO_DO_STATUS[p.status]})`).join('; ')}.
        </span>
      </figcaption>
    </figure>
  );
}
