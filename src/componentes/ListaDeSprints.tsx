'use client';

import Link from 'next/link';
import { useState } from 'react';
import { velocityMedia } from '@/dominio/metricas/velocity';
import type { Projeto } from '@/dominio/projetos/projeto';
import type { Sprint } from '@/dominio/sprints/sprint';
import { Aviso } from './Aviso';
import { CabecalhoDoProjeto } from './CabecalhoDoProjeto';
import { chamarApi, ErroDaApi } from './api';
import { ROTULO_DA_SITUACAO_DA_SPRINT, formatarData, formatarPontos } from './rotulos';
import { useRecurso } from './use-recurso';

const LINK = 'text-blue-800 underline underline-offset-2 hover:text-blue-950';

export function ListaDeSprints({ projetoId }: { projetoId: string }) {
  const { dados: projeto, erro: erroDoProjeto } = useRecurso<Projeto>(`/projetos/${projetoId}`);
  const {
    carregando,
    dados: sprints,
    erro: erroDaLista,
    recarregar,
  } = useRecurso<Sprint[]>(`/projetos/${projetoId}/sprints`);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<ErroDaApi | null>(null);

  async function criar() {
    setCriando(true);
    setErro(null);
    try {
      await chamarApi<Sprint>(`/projetos/${projetoId}/sprints`, { method: 'POST' });
      recarregar();
    } catch (e) {
      if (!(e instanceof ErroDaApi)) throw e;
      setErro(e);
    } finally {
      setCriando(false);
    }
  }

  if (!projeto) {
    return erroDoProjeto ? (
      <div className="space-y-3">
        <Aviso>{erroDoProjeto}</Aviso>
        <Link href="/" className={LINK}>
          Voltar ao Painel
        </Link>
      </div>
    ) : (
      <p className="text-slate-700">Carregando projeto…</p>
    );
  }

  const media = sprints ? velocityMedia(sprints) : null;

  return (
    <section aria-labelledby="titulo-sprints">
      <CabecalhoDoProjeto
        projetoId={projeto.id}
        nome={projeto.nome}
        tituloId="titulo-sprints"
        acoes={
          <button
            type="button"
            onClick={criar}
            disabled={criando}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {criando ? 'Criando…' : 'Criar sprint'}
          </button>
        }
      />

      <h2 className="mt-6 text-lg font-semibold">Sprints</h2>

      <div className="mt-2 space-y-3" aria-live="polite">
        {erro && <Aviso codigo={erro.codigo}>{erro.message}</Aviso>}
        {carregando && !sprints && <p className="text-slate-700">Carregando sprints…</p>}
        {erroDaLista && <Aviso>{erroDaLista}</Aviso>}

        {sprints && (
          <p className="text-sm text-slate-700">
            Velocity média das últimas sprints encerradas:{' '}
            {media === null ? 'sem dados' : `${formatarPontos(media)} pontos`}. Cada sprint dura{' '}
            {projeto.duracaoSprintDias} dias corridos.
          </p>
        )}

        {sprints && sprints.length === 0 && (
          <p className="text-slate-700">Nenhuma sprint ainda. Crie a primeira sprint do projeto.</p>
        )}

        {sprints && sprints.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <caption className="sr-only">Sprints do projeto</caption>
              <thead className="border-b border-slate-200 bg-slate-100 text-slate-700">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Sprint
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Período
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Meta
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Situação
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Velocity
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Abrir
                  </th>
                </tr>
              </thead>
              <tbody>
                {sprints.map((sprint) => {
                  const base = `/projetos/${projeto.id}/sprints/${sprint.id}`;
                  return (
                    <tr
                      key={sprint.id}
                      className="border-b border-slate-100 align-top last:border-0"
                    >
                      <th scope="row" className="px-3 py-2 font-medium">
                        Sprint {sprint.numero}
                      </th>
                      <td className="px-3 py-2">
                        {formatarData(sprint.inicio)} a {formatarData(sprint.fim)}
                      </td>
                      <td className="px-3 py-2">{sprint.meta || '—'}</td>
                      <td className="px-3 py-2">{ROTULO_DA_SITUACAO_DA_SPRINT[sprint.situacao]}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {sprint.velocity === null ? '—' : sprint.velocity}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {sprint.situacao !== 'encerrada' && (
                            <Link
                              href={`${base}/planejamento`}
                              className={LINK}
                              aria-label={`Planejamento da sprint ${sprint.numero}`}
                            >
                              Planejamento
                            </Link>
                          )}
                          {sprint.situacao !== 'planejada' && (
                            <Link
                              href={base}
                              className={LINK}
                              aria-label={`Quadro da sprint ${sprint.numero}`}
                            >
                              Quadro
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
