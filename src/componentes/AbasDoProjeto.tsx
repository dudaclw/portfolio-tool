'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Abas dentro de um projeto. Sprints e Métricas entram nos marcos M3 e M6. */
export function AbasDoProjeto({ projetoId }: { projetoId: string }) {
  const caminho = usePathname();
  const base = `/projetos/${projetoId}`;
  const abas = [
    { href: base, rotulo: 'Visão geral' },
    { href: `${base}/backlog`, rotulo: 'Backlog' },
  ];

  return (
    <nav aria-label="Seções do projeto" className="mt-4 border-b border-slate-200">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {abas.map(({ href, rotulo }) => {
          const ativa = caminho === href || (href !== base && caminho.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativa ? 'page' : undefined}
                className={
                  'block whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ' +
                  (ativa
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-600 hover:border-slate-400 hover:text-slate-900')
                }
              >
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
