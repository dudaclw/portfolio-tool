'use client';

import { useState, type ReactNode } from 'react';
import { ErroDaApi } from './api';
import { Confirmacao } from './Confirmacao';

interface PropriedadesDoBotaoRemover {
  /** Nome acessível do botão (por exemplo "Remover alocação de Ana"). */
  rotulo: string;
  titulo: string;
  children: ReactNode;
  aoRemover: () => Promise<void>;
}

/** Botão "Remover" que antes pede confirmação e mostra o erro da API na própria janela. */
export function BotaoRemover({ rotulo, titulo, children, aoRemover }: PropriedadesDoBotaoRemover) {
  const [aberta, setAberta] = useState(false);
  const [erro, setErro] = useState<ErroDaApi | null>(null);
  const [ocupada, setOcupada] = useState(false);

  async function confirmar() {
    setOcupada(true);
    setErro(null);
    try {
      await aoRemover();
      setAberta(false);
    } catch (e) {
      if (!(e instanceof ErroDaApi)) throw e;
      setErro(e);
    }
    setOcupada(false);
  }

  return (
    <>
      <button
        type="button"
        aria-label={rotulo}
        onClick={() => {
          setErro(null);
          setAberta(true);
        }}
        className="rounded-md border border-slate-400 px-2.5 py-1 text-xs font-medium hover:bg-slate-100"
      >
        Remover
      </button>
      <Confirmacao
        aberta={aberta}
        titulo={titulo}
        rotuloDeConfirmar="Remover"
        aoConfirmar={confirmar}
        aoCancelar={() => setAberta(false)}
        erro={erro?.message}
        codigoDoErro={erro?.codigo}
        ocupada={ocupada}
      >
        {children}
      </Confirmacao>
    </>
  );
}
