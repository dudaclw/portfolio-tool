'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITENS = [
  { href: '/', rotulo: 'Painel' },
  { href: '/equipe', rotulo: 'Equipe' },
] as const;

function estaAtivo(caminho: string, href: string): boolean {
  return href === '/'
    ? caminho === '/' || caminho.startsWith('/projetos')
    : caminho.startsWith(href);
}

export function NavegacaoPrincipal() {
  const caminho = usePathname();

  return (
    <nav aria-label="Navegação principal">
      <ul className="flex gap-1">
        {ITENS.map(({ href, rotulo }) => {
          const ativo = estaAtivo(caminho, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo ? 'page' : undefined}
                className={
                  'block rounded-md px-3 py-2 text-sm font-medium ' +
                  (ativo
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900')
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
