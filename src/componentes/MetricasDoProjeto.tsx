'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import type { BurndownDaSprint, VelocityDoProjeto } from '@/aplicacao/metricas/casos-de-uso';
import type { ProgressoDoProjeto as Progresso } from '@/dominio/metricas/progresso';
import type { Projeto } from '@/dominio/projetos/projeto';
import type { Sprint } from '@/dominio/sprints/sprint';
import { Aviso } from './Aviso';
import { CabecalhoDoProjeto } from './CabecalhoDoProjeto';
import { CLASSE_DO_CAMPO } from './Campo';
import { GraficoDeBurndown } from './GraficoDeBurndown';
import { GraficoDeVelocity } from './GraficoDeVelocity';
import { ProgressoDoProjeto } from './ProgressoDoProjeto';
import { ROTULO_DA_SITUACAO_DA_SPRINT, formatarData } from './rotulos';
import { useRecurso } from './use-recurso';

const LINK = 'text-blue-800 underline underline-offset-2 hover:text-blue-950';

/** Sprint mostrada por padrão: a ativa; senão a última já iniciada; senão a primeira. */
function sprintInicial(sprints: Sprint[]): Sprint | undefined {
  return (
    sprints.find((s) => s.situacao === 'ativa') ??
    [...sprints].reverse().find((s) => s.situacao === 'encerrada') ??
    sprints[0]
  );
}

export function MetricasDoProjeto({ projetoId }: { projetoId: string }) {
  const { dados: projeto, erro: erroDoProjeto } = useRecurso<Projeto>(`/projetos/${projetoId}`);
  const { dados: sprints, erro: erroDasSprints } = useRecurso<Sprint[]>(
    `/projetos/${projetoId}/sprints`,
  );
  const { dados: velocity, erro: erroDaVelocity } = useRecurso<VelocityDoProjeto>(
    `/projetos/${projetoId}/velocity`,
  );
  const { dados: progresso, erro: erroDoProgresso } = useRecurso<Progresso>(
    `/projetos/${projetoId}/progresso`,
  );
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const idDoSeletor = useId();

  const erro = erroDoProjeto ?? erroDasSprints ?? erroDaVelocity ?? erroDoProgresso;
  if (!projeto || !sprints || !velocity || !progresso) {
    return erro ? (
      <div className="space-y-3">
        <Aviso>{erro}</Aviso>
        <Link href="/" className={LINK}>
          Voltar ao Painel
        </Link>
      </div>
    ) : (
      <p className="text-slate-700">Carregando métricas…</p>
    );
  }

  const sprint = sprints.find((s) => s.id === escolhida) ?? sprintInicial(sprints);

  return (
    <section aria-labelledby="titulo-metricas">
      <CabecalhoDoProjeto projetoId={projeto.id} nome={projeto.nome} tituloId="titulo-metricas" />

      <div className="mt-6 space-y-10">
        <section aria-labelledby="titulo-progresso" className="space-y-3">
          <h2 id="titulo-progresso" className="text-lg font-semibold">
            Progresso do projeto
          </h2>
          <ProgressoDoProjeto progresso={progresso} />
        </section>

        <section aria-labelledby="titulo-burndown" className="space-y-3">
          <h2 id="titulo-burndown" className="text-lg font-semibold">
            Burndown da sprint
          </h2>
          {sprints.length === 0 || !sprint ? (
            <p className="text-slate-700">
              Nenhuma sprint ainda.{' '}
              <Link href={`/projetos/${projeto.id}/sprints`} className={LINK}>
                Crie a primeira sprint
              </Link>{' '}
              para acompanhar o burndown.
            </p>
          ) : (
            <>
              <div>
                <label htmlFor={idDoSeletor} className="block text-sm font-medium">
                  Sprint exibida
                </label>
                <select
                  id={idDoSeletor}
                  className={`${CLASSE_DO_CAMPO} max-w-md`}
                  value={sprint.id}
                  onChange={(e) => setEscolhida(e.target.value)}
                >
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      Sprint {s.numero} · {formatarData(s.inicio)} a {formatarData(s.fim)} ·{' '}
                      {ROTULO_DA_SITUACAO_DA_SPRINT[s.situacao]}
                    </option>
                  ))}
                </select>
              </div>
              <BurndownEscolhido key={sprint.id} sprint={sprint} />
            </>
          )}
        </section>

        <section aria-labelledby="titulo-velocity" className="space-y-3">
          <h2 id="titulo-velocity" className="text-lg font-semibold">
            Velocity
          </h2>
          <p className="text-sm">
            <strong>Média das últimas 3 sprints encerradas:</strong>{' '}
            {velocity.media === null
              ? 'sem dados'
              : `${velocity.media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} pontos`}
            . A velocity é do projeto, nunca de uma pessoa.
          </p>
          <GraficoDeVelocity velocity={velocity} />
          {velocity.sprints.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-blue-800 underline underline-offset-2">
                Ver os números em tabela
              </summary>
              <div className="relative mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full min-w-[16rem] text-left">
                  <caption className="sr-only">Velocity por sprint encerrada</caption>
                  <thead className="border-b border-slate-200 bg-slate-100 text-slate-700">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Sprint
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Velocity
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {velocity.sprints.map((s) => (
                      <tr key={s.sprintId} className="border-b border-slate-100 last:border-0">
                        <th scope="row" className="px-3 py-1.5 font-medium">
                          Sprint {s.numero}
                        </th>
                        <td className="px-3 py-1.5 tabular-nums">{s.velocity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </section>
      </div>
    </section>
  );
}

function BurndownEscolhido({ sprint }: { sprint: Sprint }) {
  const { dados: burndown, erro } = useRecurso<BurndownDaSprint>(`/sprints/${sprint.id}/burndown`);
  if (erro) return <Aviso>{erro}</Aviso>;
  if (!burndown) return <p className="text-slate-700">Carregando burndown…</p>;
  return <GraficoDeBurndown burndown={burndown} numeroDaSprint={sprint.numero} />;
}
