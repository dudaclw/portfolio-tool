'use client';

import Link from 'next/link';
import type { CapacidadeComSprint } from '@/aplicacao/recursos/casos-de-uso';
import type { SprintDetalhada } from '@/aplicacao/sprints/casos-de-uso';
import type { ItemBacklog } from '@/dominio/backlog/item-backlog';
import type { ProgressoDoProjeto as Progresso } from '@/dominio/metricas/progresso';
import { velocityMedia } from '@/dominio/metricas/velocity';
import type { Alocacao, Pessoa } from '@/dominio/recursos/recursos';
import type { Sprint } from '@/dominio/sprints/sprint';
import { CapacidadeDaSprint } from './CapacidadeDaSprint';
import { ProgressoDoProjeto } from './ProgressoDoProjeto';
import { formatarData, formatarPontos } from './rotulos';
import { useRecurso } from './use-recurso';

const LINK = 'text-blue-800 underline underline-offset-2 hover:text-blue-950';

/** Sprint atual (com capacidade), velocity média e pessoas alocadas, na Visão geral do projeto. */
export function ResumoDoProjeto({ projetoId }: { projetoId: string }) {
  const { dados: sprints } = useRecurso<Sprint[]>(`/projetos/${projetoId}/sprints`);
  const { dados: alocacoes } = useRecurso<Alocacao[]>(`/alocacoes?projetoId=${projetoId}`);
  const { dados: pessoas } = useRecurso<Pessoa[]>('/pessoas');
  const { dados: progresso } = useRecurso<Progresso>(`/projetos/${projetoId}/progresso`);
  const { dados: itens } = useRecurso<ItemBacklog[]>(`/projetos/${projetoId}/itens`);

  const impedidos = (itens ?? []).filter((item) => item.impedido !== null);
  const ativa = sprints?.find((sprint) => sprint.situacao === 'ativa');
  const media = sprints ? velocityMedia(sprints) : null;

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section
        aria-labelledby="titulo-andamento"
        className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm"
      >
        <h2 id="titulo-andamento" className="text-lg font-semibold">
          % concluído
        </h2>
        {progresso ? (
          <ProgressoDoProjeto progresso={progresso} />
        ) : (
          <p className="text-slate-700">Carregando…</p>
        )}
      </section>

      <section
        aria-labelledby="titulo-impedimentos"
        className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm"
      >
        <h2 id="titulo-impedimentos" className="text-lg font-semibold">
          Impedimentos abertos
        </h2>
        {!itens ? (
          <p className="text-slate-700">Carregando…</p>
        ) : impedidos.length === 0 ? (
          <p className="text-slate-700">Nenhum item impedido.</p>
        ) : (
          <ul className="space-y-1">
            {impedidos.map((item) => (
              <li key={item.id}>
                <strong>{item.titulo}</strong>: {item.impedido?.motivo}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="titulo-sprint-atual"
        className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm"
      >
        <h2 id="titulo-sprint-atual" className="text-lg font-semibold">
          Sprint atual
        </h2>
        {!sprints ? (
          <p className="text-slate-700">Carregando…</p>
        ) : ativa ? (
          <SprintAtual sprint={ativa} projetoId={projetoId} />
        ) : (
          <p className="text-slate-700">
            Nenhuma sprint ativa.{' '}
            <Link href={`/projetos/${projetoId}/sprints`} className={LINK}>
              Ver as sprints
            </Link>
          </p>
        )}
        <p>
          <strong>Velocity média</strong> das últimas sprints encerradas:{' '}
          {media === null ? 'sem dados' : `${formatarPontos(media)} pontos`}.
        </p>
      </section>

      <section
        aria-labelledby="titulo-alocados"
        className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm"
      >
        <h2 id="titulo-alocados" className="text-lg font-semibold">
          Pessoas alocadas
        </h2>
        {!alocacoes || !pessoas ? (
          <p className="text-slate-700">Carregando…</p>
        ) : alocacoes.length === 0 ? (
          <p className="text-slate-700">
            Ninguém alocado ainda. Aloque pessoas na tela{' '}
            <Link href="/equipe" className={LINK}>
              Equipe
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-1">
            {alocacoes.map((alocacao) => (
              <li key={alocacao.id}>
                <strong>{pessoas.find((p) => p.id === alocacao.pessoaId)?.nome ?? '—'}</strong> ·{' '}
                {alocacao.percentual}% · {formatarData(alocacao.inicio)} a{' '}
                {formatarData(alocacao.fim)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SprintAtual({ sprint, projetoId }: { sprint: Sprint; projetoId: string }) {
  const { dados: detalhe } = useRecurso<SprintDetalhada>(`/sprints/${sprint.id}`);
  const { dados: capacidade } = useRecurso<CapacidadeComSprint>(`/sprints/${sprint.id}/capacidade`);
  const restantes = detalhe?.diasUteisRestantes;

  return (
    <>
      <p>
        <strong>Sprint {sprint.numero}</strong> · {formatarData(sprint.inicio)} a{' '}
        {formatarData(sprint.fim)}
        {restantes !== null &&
          restantes !== undefined &&
          ` · ${restantes === 1 ? 'falta 1 dia útil' : `faltam ${restantes} dias úteis`}`}
      </p>
      <p>
        <strong>Meta:</strong> {sprint.meta || 'não definida'}
      </p>
      {capacidade && <CapacidadeDaSprint capacidade={capacidade} />}
      <p>
        <Link href={`/projetos/${projetoId}/sprints/${sprint.id}`} className={LINK}>
          Abrir o quadro
        </Link>
      </p>
    </>
  );
}
