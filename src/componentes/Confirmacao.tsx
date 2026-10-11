'use client';

import type { ReactNode } from 'react';
import { Aviso } from './Aviso';
import { Modal } from './Modal';

interface PropriedadesDaConfirmacao {
  aberta: boolean;
  titulo: string;
  children: ReactNode;
  rotuloDeConfirmar: string;
  aoConfirmar: () => void;
  aoCancelar: () => void;
  /** Mensagem de uma tentativa que falhou (a da API, sem reescrever). */
  erro?: string | null;
  codigoDoErro?: string | undefined;
  ocupada?: boolean;
}

/** Confirmação de ação irreversível (remover item, encerrar sprint). */
export function Confirmacao({
  aberta,
  titulo,
  children,
  rotuloDeConfirmar,
  aoConfirmar,
  aoCancelar,
  erro,
  codigoDoErro,
  ocupada,
}: PropriedadesDaConfirmacao) {
  return (
    <Modal aberto={aberta} titulo={titulo} aoFechar={aoCancelar}>
      <div className="space-y-4">
        <div className="text-sm">{children}</div>
        {erro && <Aviso codigo={codigoDoErro}>{erro}</Aviso>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={aoCancelar}
            className="rounded-md border border-slate-400 px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={aoConfirmar}
            disabled={ocupada}
            className="rounded-md bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-900 disabled:opacity-60"
          >
            {rotuloDeConfirmar}
          </button>
        </div>
      </div>
    </Modal>
  );
}
