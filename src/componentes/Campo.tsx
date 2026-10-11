import type { ReactNode } from 'react';

export const CLASSE_DO_CAMPO =
  'mt-1 block w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm aria-[invalid=true]:border-red-600';

/** Rótulo, campo, ajuda e mensagem de erro de um campo de formulário. */
export function Campo({
  id,
  rotulo,
  erro,
  ajuda,
  children,
}: {
  id: string;
  rotulo: string;
  erro: string | undefined;
  ajuda?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {rotulo}
      </label>
      {children}
      {ajuda && !erro && (
        <p id={`${id}-ajuda`} className="mt-1 text-xs text-slate-600">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} className="mt-1 text-sm text-red-700">
          {erro}
        </p>
      )}
    </div>
  );
}
