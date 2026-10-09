'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Projeto } from '@/dominio/projetos/projeto';
import { Aviso } from './Aviso';
import { FormularioDeProjeto } from './FormularioDeProjeto';
import { Modal } from './Modal';
import { ROTULO_DO_STATUS, formatarData } from './rotulos';
import { useRecurso } from './use-recurso';

export function ListaDeProjetos() {
  const roteador = useRouter();
  const { carregando, dados: projetos, erro, recarregar } = useRecurso<Projeto[]>('/projetos');
  const [criando, setCriando] = useState(false);

  return (
    <section aria-labelledby="titulo-painel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="titulo-painel" className="text-2xl font-semibold">
          Painel
        </h1>
        <button
          type="button"
          onClick={() => setCriando(true)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Novo projeto
        </button>
      </div>

      <div className="mt-4" aria-live="polite">
        {carregando && !projetos && <p className="text-slate-700">Carregando projetos…</p>}

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

        {projetos && projetos.length === 0 && (
          <p className="text-slate-700">Nenhum projeto ainda. Crie o primeiro projeto.</p>
        )}

        {projetos && projetos.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[32rem] text-left text-sm">
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
                </tr>
              </thead>
              <tbody>
                {projetos.map((projeto) => (
                  <tr key={projeto.id} className="border-b border-slate-100 last:border-0">
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
          aoSalvar={(projeto) => {
            setCriando(false);
            roteador.push(`/projetos/${projeto.id}`);
          }}
        />
      </Modal>
    </section>
  );
}
