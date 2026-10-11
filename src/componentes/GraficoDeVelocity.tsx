'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { VelocityDoProjeto } from '@/aplicacao/metricas/casos-de-uso';
import { formatarPontos } from './rotulos';

const eixo = { fontSize: 12, fill: 'var(--grafico-eixo)' };

/**
 * Velocity por sprint encerrada (barras azuis) e a média das 3 últimas (linha laranja tracejada,
 * com rótulo direto). A velocity é do projeto, nunca da pessoa (RN-09).
 */
export function GraficoDeVelocity({ velocity }: { velocity: VelocityDoProjeto }) {
  if (velocity.sprints.length === 0) {
    return (
      <p className="text-sm text-slate-700">
        Sem dados. A velocity aparece depois que a primeira sprint for encerrada.
      </p>
    );
  }

  const dados = velocity.sprints.map((sprint) => ({
    ...sprint,
    rotulo: `Sprint ${sprint.numero}`,
  }));
  const maximo = Math.max(1, ...velocity.sprints.map((s) => s.velocity), velocity.media ?? 0);
  const resumo = `Velocity por sprint: ${velocity.sprints
    .map((s) => `sprint ${s.numero}, ${s.velocity} pontos`)
    .join(
      '; ',
    )}. Média das últimas sprints: ${velocity.media === null ? 'sem dados' : formatarPontos(velocity.media)} pontos.`;

  return (
    <figure className="space-y-2">
      <div role="img" aria-label={resumo} style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 20, right: 16, bottom: 0, left: -8 }}>
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
              domain={[0, Math.ceil(maximo * 1.15)]}
              width={36}
            />
            <Tooltip
              formatter={(valor) => [`${valor} pts`, 'Velocity']}
              cursor={{ fill: 'var(--grafico-grade)' }}
            />
            <Bar
              dataKey="velocity"
              name="Velocity"
              fill="var(--serie-1)"
              radius={[4, 4, 0, 0]}
              maxBarSize={72}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="velocity"
                position="top"
                style={{ fontSize: 12, fill: 'var(--grafico-eixo)' }}
              />
            </Bar>
            {velocity.media !== null && (
              <ReferenceLine
                y={velocity.media}
                stroke="var(--serie-2)"
                strokeWidth={2}
                strokeDasharray="6 4"
                label={{
                  value: `Média ${formatarPontos(velocity.media)}`,
                  position: 'insideTopRight',
                  fontSize: 12,
                  fill: 'var(--grafico-eixo)',
                }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-sm text-slate-700">
        Barras: velocity de cada sprint encerrada. Linha tracejada: média das últimas 3 sprints
        encerradas.
      </figcaption>
    </figure>
  );
}
