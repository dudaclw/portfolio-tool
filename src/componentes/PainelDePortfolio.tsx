'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Portfolio, ProjetoNoPortfolio } from '@/aplicacao/metricas/casos-de-uso';
import type { Projeto } from '@/dominio/projetos/projeto';
import { Aviso } from './Aviso';
import { FormularioDeProjeto } from './FormularioDeProjeto';
import { LinhaDoTempoDoPortfolio } from './LinhaDoTempoDoPortfolio';
import { Modal } from './Modal';
import { ROTULO_DO_STATUS, formatarData } from './rotulos';
import { useRecurso } from './use-recurso';

type Visao = 'lista' | 'linha-do-tempo';

const BOTAO_DA_VISAO =
  'px-3 py-1.5 text-sm font-medium first:rounded-l-md last:rounded-r-md border border-slate-400 aria-pressed:bg-slate-900 aria-pressed:text-white aria-pressed:border-slate-900 hover:bg-slate-100 aria-pressed:hover:bg-slate-900';

function Alertas({ alertas }: { alertas: ProjetoNoPortfolio['alertas'] }) {
  const { itensImpedidos, sobrecarga } = alertas;
  if (itensImpedidos === 0 && sobrecarga.length === 0)
    return <span className="text-slate-600">Nenhum</span>;
  return (
    <ul className="space-y-1">
      {itensImpedidos > 0 && (
        <li>
          <span aria-hidden="true">⚠ </span>
          {itensImpedidos} {itensImpedidos === 1 ? 'item impedido' : 'itens impedidos'}
        </li>
      )}
      {sobrecarga.map((aviso) => (
        <li key={`${aviso.pessoaId}-${aviso.de}`}>
          <span aria-hidden="true">⚠ </span>
          Sobrecarga: {aviso.mensagem.split(' está ')[0]} ({aviso.pico}%)
        </li>
      ))}
    </ul>
  );
}

export function PainelDePortfolio() {
  const roteador = useRouter();
  const { carregando, dados: portfolio, erro, recarregar } = useRecurso<Portfolio>('/portfolio');
  const [criando, setCriando] = useState(false);
  const [visao, setVisao] = useState<Visao>('lista');

  return (
    <section aria-labelledby="titulo-painel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="titulo-painel" className="text-2xl font-semibold">
          Painel
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Visão do painel" className="flex">
            <button
              type="button"
              aria-pressed={visao === 'lista'}
              onClick={() => setVisao('lista')}
              className={BOTAO_DA_VISAO}
            >
              Lista
            </button>
            <button
              type="button"
              aria-pressed={visao === 'linha-do-tempo'}
              onClick={() => setVisao('linha-do-tempo')}
              className={`${BOTAO_DA_VISAO} -ml-px`}
            >
              Linha do tempo
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Novo projeto
          </button>
        </div>
      </div>

      <div className="mt-4" aria-live="polite">
        {carregando && !portfolio && <p className="text-slate-700">Carregando projetos…</p>}

        {erro && (
          <div className="space-y-2">
            <Aviso>{erro}</Aviso>
            <button
              type="button"
              onClick={recarregar}
              className="rounded-md border border-slate-400 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
            >
              Tentar de novo
            </button>
          </div>
        )}

        {portfolio && portfolio.projetos.length === 0 && (
          <p className="text-slate-700">Nenhum projeto ainda. Crie o primeiro projeto.</p>
        )}

        {portfolio && portfolio.projetos.length > 0 && visao === 'linha-do-tempo' && (
          <LinhaDoTempoDoPortfolio portfolio={portfolio} />
        )}

        {portfolio && portfolio.projetos.length > 0 && visao === 'lista' && (
          <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <caption className="sr-only">Projetos</caption>
              <thead className="border-b border-slate-200 bg-slate-100 text-slate-700">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Projeto
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Início
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Fim previsto
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    % concluído
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Sprint atual
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Alertas
                  </th>
                </tr>
              </thead>
              <tbody>
                {portfolio.projetos.map((projeto) => (
                  <tr
                    key={projeto.id}
                    className="border-b border-slate-100 align-top last:border-0"
                  >
                    <th scope="row" className="px-4 py-3 font-medium">
                      <Link
                        href={`/projetos/${projeto.id}`}
                        className="text-blue-800 underline underline-offset-2 hover:text-blue-950"
                      >
                        {projeto.nome}
                      </Link>
                    </th>
                    <td className="px-4 py-3">{ROTULO_DO_STATUS[projeto.status]}</td>
                    <td className="px-4 py-3">{formatarData(projeto.inicio)}</td>
                    <td className="px-4 py-3">{formatarData(projeto.fimPrevisto)}</td>
                    <td className="px-4 py-3">
                      <span className="tabular-nums">
                        {projeto.progresso.percentual === null
                          ? 'Sem estimativas'
                          : `${projeto.progresso.percentual}%`}
                      </span>
                      {projeto.progresso.semEstimativa > 0 && (
                        <span className="block text-xs text-slate-600">
                          {projeto.progresso.semEstimativa}{' '}
                          {projeto.progresso.semEstimativa === 1
                            ? 'item sem estimativa'
                            : 'itens sem estimativa'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {projeto.sprintAtual ? (
                        <>
                          <Link
                            href={`/projetos/${projeto.id}/sprints/${projeto.sprintAtual.id}`}
                            className="text-blue-800 underline underline-offset-2 hover:text-blue-950"
                          >
                            Sprint {projeto.sprintAtual.numero}
                          </Link>
                          <span className="block text-xs text-slate-600">
                            {projeto.sprintAtual.diasUteisRestantes === 1
                              ? '1 dia útil restante'
                              : `${projeto.sprintAtual.diasUteisRestantes} dias úteis restantes`}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-600">Nenhuma ativa</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Alertas alertas={projeto.alertas} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal aberto={criando} titulo="Novo projeto" aoFechar={() => setCriando(false)}>
        <FormularioDeProjeto
          aoCancelar={() => setCriando(false)}
          aoSalvar={(projeto: Projeto) => {
            setCriando(false);
            roteador.push(`/projetos/${projeto.id}`);
          }}
        />
      </Modal>
    </section>
  );
}
