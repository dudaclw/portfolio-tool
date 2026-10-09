'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Projeto } from '@/dominio/projetos/projeto';
import { Aviso } from './Aviso';
import { FormularioDeProjeto } from './FormularioDeProjeto';
import { Modal } from './Modal';
import { ROTULO_DO_STATUS, formatarData } from './rotulos';
import { useRecurso } from './use-recurso';

export function VisaoGeralDoProjeto({ projetoId }: { projetoId: string }) {
  const {
    carregando,
    dados: projeto,
    erro,
    recarregar,
  } = useRecurso<Projeto>(`/projetos/${projetoId}`);
  const [editando, setEditando] = useState(false);

  if (carregando && !projeto) return <p className="text-slate-700">Carregando projeto…</p>;

  if (!projeto) {
    return (
      <div className="space-y-3">
        <Aviso>{erro ?? 'Projeto não encontrado.'}</Aviso>
        <Link href="/" className="text-blue-800 underline underline-offset-2">
          Voltar ao Painel
        </Link>
      </div>
    );
  }

  return (
    <article aria-labelledby="titulo-projeto">
      <p className="text-sm">
        <Link href="/" className="text-blue-800 underline underline-offset-2">
          ← Painel
        </Link>
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 id="titulo-projeto" className="text-2xl font-semibold">
          {projeto.nome}
        </h1>
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="rounded-md border border-slate-400 px-4 py-2 text-sm font-medium hover:bg-slate-100"
        >
          Editar projeto
        </button>
      </div>

      <section aria-labelledby="titulo-visao-geral" className="mt-6">
        <h2 id="titulo-visao-geral" className="text-lg font-semibold">
          Visão geral
        </h2>
        <dl className="mt-3 grid gap-x-8 gap-y-4 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="font-medium text-slate-600">Objetivo</dt>
            <dd className="mt-1">{projeto.objetivo || 'Não informado.'}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">Status</dt>
            <dd className="mt-1">{ROTULO_DO_STATUS[projeto.status]}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">Patrocinador</dt>
            <dd className="mt-1">{projeto.patrocinador ?? 'Não informado.'}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">Início</dt>
            <dd className="mt-1">{formatarData(projeto.inicio)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">Fim previsto</dt>
            <dd className="mt-1">{formatarData(projeto.fimPrevisto)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">Duração da sprint</dt>
            <dd className="mt-1">{projeto.duracaoSprintDias} dias corridos</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-slate-600">Definição de Pronto</dt>
            <dd className="mt-1">
              {projeto.definicaoDePronto.length === 0 ? (
                'Nenhum critério definido.'
              ) : (
                <ul className="list-disc space-y-1 pl-5">
                  {projeto.definicaoDePronto.map((criterio) => (
                    <li key={criterio}>{criterio}</li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <Modal aberto={editando} titulo="Editar projeto" aoFechar={() => setEditando(false)}>
        <FormularioDeProjeto
          projeto={projeto}
          aoCancelar={() => setEditando(false)}
          aoSalvar={() => {
            setEditando(false);
            recarregar();
          }}
        />
      </Modal>
    </article>
  );
}
