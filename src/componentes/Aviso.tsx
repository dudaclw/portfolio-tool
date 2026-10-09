import type { ReactNode } from 'react';

/** Aviso visível ao lado da ação. O texto da regra aparece como a API devolveu (detail). */
export function Aviso({ children, codigo }: { children: ReactNode; codigo?: string | undefined }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900"
    >
      <strong className="font-semibold">Atenção{codigo ? ` (${codigo})` : ''}: </strong>
      {children}
    </div>
  );
}
