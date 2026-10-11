'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BurndownDaSprint } from '@/aplicacao/metricas/casos-de-uso';
import { formatarData } from './rotulos';

const eixo = { fontSize: 12, fill: 'var(--grafico-eixo)' };

/**
 * Burndown da sprint: restante (azul, linha cheia com marcadores), escopo (laranja, em degraus) e
 * a linha ideal (cinza tracejada). Além da cor, cada série tem forma própria; a tabela logo
 * abaixo traz os mesmos números para quem não enxerga o gráfico.
 */
export function GraficoDeBurndown({
  burndown,
  numeroDaSprint,
  compacto = false,
}: {
  burndown: BurndownDaSprint;
  numeroDaSprint: number;
  compacto?: boolean;
}) {
  const dados = burndown.dias.map((dia) => ({
    ...dia,
    rotulo: formatarData(dia.data).slice(0, 5),
  }));
  const maximo = Math.max(1, ...burndown.dias.map((dia) => Math.max(dia.ideal, dia.escopo ?? 0)));
  const resumo =
    burndown.restante === null
      ? `Burndown da sprint ${numeroDaSprint}: a sprint ainda não começou.`
      : `Burndown da sprint ${numeroDaSprint}: restam ${burndown.restante} de ${burndown.escopo} pontos de escopo.`;

  if (burndown.dias.length === 0) {
    return <p className="text-sm text-slate-700">Esta sprint não tem dias úteis.</p>;
  }

  return (
    <figure className="space-y-2">
      <figcaption className="text-sm">
        {burndown.restante === null ? (
          'A sprint ainda não começou: só a linha ideal está desenhada.'
        ) : (
          <>
            <strong>Restante:</strong> {burndown.restante} pts · <strong>Escopo:</strong>{' '}
            {burndown.escopo} pts
          </>
        )}
      </figcaption>

      <div role="img" aria-label={resumo} style={{ height: compacto ? 240 : 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="var(--grafico-grade)" vertical={false} />
            <XAxis
              dataKey="rotulo"
              tick={eixo}
              tickLine={false}
              axisLine={{ stroke: 'var(--grafico-grade)' }}
            />
            <YAxis
              tick={eixo}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, maximo]}
              width={36}
            />
            <Tooltip
              labelFormatter={(_, itens) => {
                const data = itens?.[0]?.payload?.data as string | undefined;
                return data ? formatarData(data) : '';
              }}
              formatter={(valor, nome) => [`${valor} pts`, nome]}
            />
            <Legend
              verticalAlign="top"
              height={28}
              iconType="plainline"
              wrapperStyle={{ fontSize: 12 }}
            />
            <Line
              name="Ideal"
              dataKey="ideal"
              stroke="var(--grafico-referencia)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              name="Escopo"
              dataKey="escopo"
              type="stepAfter"
              stroke="var(--serie-2)"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              name="Restante"
              dataKey="restante"
              stroke="var(--serie-1)"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, stroke: '#fcfcfb', fill: 'var(--serie-1)' }}
              activeDot={{ r: 6 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {!compacto && (
        <details className="text-sm">
          <summary className="cursor-pointer text-blue-800 underline underline-offset-2">
            Ver os números em tabela
          </summary>
          <div className="relative mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[22rem] text-left">
              <caption className="sr-only">
                Burndown da sprint {numeroDaSprint} por dia útil
              </caption>
              <thead className="border-b border-slate-200 bg-slate-100 text-slate-700">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Dia
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Restante
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Escopo
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Ideal
                  </th>
                </tr>
              </thead>
              <tbody>
                {burndown.dias.map((dia) => (
                  <tr key={dia.data} className="border-b border-slate-100 last:border-0">
                    <th scope="row" className="px-3 py-1.5 font-medium tabular-nums">
                      {formatarData(dia.data)}
                    </th>
                    <td className="px-3 py-1.5 tabular-nums">{dia.restante ?? '—'}</td>
                    <td className="px-3 py-1.5 tabular-nums">{dia.escopo ?? '—'}</td>
                    <td className="px-3 py-1.5 tabular-nums">
                      {dia.ideal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </figure>
  );
}
