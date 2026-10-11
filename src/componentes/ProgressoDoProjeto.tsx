import type { ProgressoDoProjeto as Progresso } from '@/dominio/metricas/progresso';

/** RN-11: pontos dos itens concluídos ÷ pontos de todos os itens estimados. */
export function ProgressoDoProjeto({ progresso }: { progresso: Progresso }) {
  const { percentual, pontosConcluidos, pontosTotais, semEstimativa } = progresso;
  return (
    <div className="space-y-2 text-sm">
      {percentual === null ? (
        <p className="text-slate-700">
          Sem pontos estimados ainda. Estime os itens no backlog para acompanhar o progresso.
        </p>
      ) : (
        <>
          <p className="text-3xl font-semibold tabular-nums">{percentual}%</p>
          <div
            role="progressbar"
            aria-label="Percentual concluído do projeto"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentual}
            className="h-3 w-full max-w-md overflow-hidden rounded-full bg-slate-200"
          >
            <div
              className="h-full rounded-full bg-[var(--serie-1)]"
              style={{ width: `${percentual}%` }}
            />
          </div>
          <p>
            <strong>{pontosConcluidos}</strong> de <strong>{pontosTotais}</strong> pontos estimados
            concluídos ({pontosConcluidos} ÷ {pontosTotais}).
          </p>
        </>
      )}
      {semEstimativa > 0 && (
        <p className="text-slate-700">
          {semEstimativa} {semEstimativa === 1 ? 'item sem estimativa' : 'itens sem estimativa'},
          fora da conta.
        </p>
      )}
    </div>
  );
}
