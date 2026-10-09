import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NavegacaoPrincipal } from '@/componentes/NavegacaoPrincipal';
import './globals.css';

export const metadata: Metadata = {
  title: 'Portfólio de projetos ágeis',
  description: 'Backlog, sprints, capacidade e métricas, 100% local.',
};

export default function LayoutRaiz({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
        >
          Ir para o conteúdo
        </a>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
            <span className="text-base font-semibold">Portfólio de projetos ágeis</span>
            <NavegacaoPrincipal />
          </div>
        </header>
        <main id="conteudo" className="mx-auto max-w-6xl px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
