'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

interface PropriedadesDoModal {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
}

/** Janela modal sobre o elemento nativo <dialog>: foco preso, Esc fecha, leitor de tela anuncia. */
export function Modal({ aberto, titulo, aoFechar, children }: PropriedadesDoModal) {
  const referencia = useRef<HTMLDialogElement>(null);
  const idDoTitulo = useId();

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={referencia}
      aria-labelledby={idDoTitulo}
      onClose={aoFechar}
      className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-lg border border-slate-300 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
    >
      {aberto && (
        <div className="max-h-[85vh] overflow-y-auto p-5">
          <h2 id={idDoTitulo} className="text-lg font-semibold">
            {titulo}
          </h2>
          <div className="mt-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
