'use client';

import { useState } from 'react';
import type { Pessoa } from '@/dominio/recursos/recursos';
import { chamarApi } from './api';
import { BotaoRemover } from './BotaoRemover';
import { FormularioDePessoa } from './FormularioDePessoa';
import { Modal } from './Modal';
import { formatarHoras } from './rotulos';

export function SecaoDePessoas({
  pessoas,
  aoAlterar,
}: {
  pessoas: Pessoa[];
  aoAlterar: () => void;
}) {
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<Pessoa | null>(null);

  return (
    <section aria-labelledby="titulo-pessoas" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-pessoas" className="text-lg font-semibold">
          Pessoas
        </h2>
        <button
          type="button"
          onClick={() => setCriando(true)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Nova pessoa
        </button>
      </div>

      {pessoas.length === 0 ? (
        <p className="text-slate-700">
          Nenhuma pessoa cadastrada. Cadastre a primeira pessoa da equipe.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <caption className="sr-only">Pessoas da equipe</caption>
            <thead className="border-b border-slate-200 bg-slate-100 text-slate-700">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Nome
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Função
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Jornada semanal
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {pessoas.map((pessoa) => (
                <tr key={pessoa.id} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="px-3 py-2 font-medium">
                    {pessoa.nome}
                  </th>
                  <td className="px-3 py-2">{pessoa.funcao || '—'}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatarHoras(pessoa.jornadaSemanalHoras)} h
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`Editar ${pessoa.nome}`}
                        onClick={() => setEditando(pessoa)}
                        className="rounded-md border border-slate-400 px-2.5 py-1 text-xs font-medium hover:bg-slate-100"
                      >
                        Editar
                      </button>
                      <BotaoRemover
                        rotulo={`Remover ${pessoa.nome}`}
                        titulo="Remover pessoa"
                        aoRemover={async () => {
                          await chamarApi(`/pessoas/${pessoa.id}`, { method: 'DELETE' });
                          aoAlterar();
                        }}
                      >
                        <p>
                          Remover <strong>{pessoa.nome}</strong>? As alocações e ausências dela
                          serão apagadas e ela deixará de ser responsável por itens e ações de
                          retrospectiva. Não dá para desfazer.
                        </p>
                      </BotaoRemover>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal aberto={criando} titulo="Nova pessoa" aoFechar={() => setCriando(false)}>
        <FormularioDePessoa
          aoCancelar={() => setCriando(false)}
          aoSalvar={() => {
            setCriando(false);
            aoAlterar();
          }}
        />
      </Modal>
      <Modal
        aberto={editando !== null}
        titulo={editando ? `Editar ${editando.nome}` : 'Editar pessoa'}
        aoFechar={() => setEditando(null)}
      >
        {editando && (
          <FormularioDePessoa
            pessoa={editando}
            aoCancelar={() => setEditando(null)}
            aoSalvar={() => {
              setEditando(null);
              aoAlterar();
            }}
          />
        )}
      </Modal>
    </section>
  );
}
