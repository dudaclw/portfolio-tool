import Link from 'next/link';
import type { ReactNode } from 'react';
import { AbasDoProjeto } from './AbasDoProjeto';

/** Voltar ao Painel, nome do projeto, ações da tela e as abas do projeto. */
export function CabecalhoDoProjeto({
  projetoId,
  nome,
  tituloId,
  acoes,
}: {
  projetoId: string;
  nome: string;
  tituloId: string;
  acoes?: ReactNode;
}) {
  return (
    <header>
      <p className="text-sm">
        <Link href="/" className="text-blue-800 underline underline-offset-2">
          ← Painel
        </Link>
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 id={tituloId} className="text-2xl font-semibold">
          {nome}
        </h1>
        {acoes}
      </div>
      <AbasDoProjeto projetoId={projetoId} />
    </header>
  );
}
