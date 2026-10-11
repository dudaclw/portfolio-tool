'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { SprintDetalhada } from '@/aplicacao/sprints/casos-de-uso';
import type { EstadoItem, ItemBacklog } from '@/dominio/backlog/item-backlog';
import type { Projeto } from '@/dominio/projetos/projeto';
import type { Pessoa } from '@/dominio/recursos/recursos';
import { Aviso } from './Aviso';
import { CabecalhoDoProjeto } from './CabecalhoDoProjeto';
import { chamarApi, ErroDaApi } from './api';
import { DetalhesDoItem } from './DetalhesDoItem';
import { Modal } from './Modal';
import { ROTULO_DA_SITUACAO_DA_SPRINT, formatarData } from './rotulos';
import { useRecurso } from './use-recurso';

const LINK = 'text-blue-800 underline underline-offset-2 hover:text-blue-950';

/** As quatro colunas do quadro, na ordem do fluxo, e o estado do item que cada uma representa. */
const COLUNAS: readonly { estado: EstadoItem; titulo: string }[] = [
  { estado: 'pronto_para_sprint', titulo: 'A fazer' },
  { estado: 'em_andamento', titulo: 'Em andamento' },
  { estado: 'em_revisao', titulo: 'Em revisão' },
  { estado: 'concluido', titulo: 'Concluído' },
];

const BOTAO =
  'rounded-md border border-slate-400 px-2 py-1 text-xs font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40';

export function QuadroDaSprint({ projetoId, sprintId }: { projetoId: string; sprintId: string }) {
  const { dados: projeto, erro: erroDoProjeto } = useRecurso<Projeto>(`/projetos/${projetoId}`);
  const {
    dados: sprint,
    erro: erroDaSprint,
    recarregar: recarregarSprint,
  } = useRecurso<SprintDetalhada>(`/sprints/${sprintId}`);
  const {
    dados: todos,
    erro: erroDosItens,
    recarregar: recarregarItens,
  } = useRecurso<ItemBacklog[]>(`/projetos/${projetoId}/itens`);
  const { dados: pessoasDaApi } = useRecurso<Pessoa[]>('/pessoas');

  const [abertoId, setAbertoId] = useState<string | null>(null);
  /** Erro da última tentativa de mover cada cartão, mostrado no próprio cartão. */
  const [errosPorItem, setErrosPorItem] = useState<Record<string, ErroDaApi>>({});

  const erro = erroDoProjeto ?? erroDaSprint ?? erroDosItens;
  if (!projeto || !sprint || !todos) {
    return erro ? (
      <div className="space-y-3">
        <Aviso>{erro}</Aviso>
        <Link href={`/projetos/${projetoId}/sprints`} className={LINK}>
          Voltar às sprints
        </Link>
      </div>
    ) : (
      <p className="text-slate-700">Carregando quadro…</p>
    );
  }

  const itens = todos.filter((item) => item.sprintId === sprint.id);
  const nomeDe = (responsavelId: string | null) =>
    (pessoasDaApi ?? []).find((pessoa) => pessoa.id === responsavelId)?.nome;
  const itemAberto = itens.find((item) => item.id === abertoId) ?? null;
  const ativa = sprint.situacao === 'ativa';
  const base = `/projetos/${projeto.id}/sprints/${sprint.id}`;

  async function mover(item: ItemBacklog, para: EstadoItem) {
    setErrosPorItem((atuais) => {
      const resto = { ...atuais };
      delete resto[item.id];
      return resto;
    });
    try {
      await chamarApi(`/itens/${item.id}/transicoes`, {
        method: 'POST',
        body: JSON.stringify({ para }),
      });
    } catch (e) {
      if (!(e instanceof ErroDaApi)) throw e;
      setErrosPorItem((atuais) => ({ ...atuais, [item.id]: e }));
    }
    recarregarItens();
  }

  return (
    <section aria-labelledby="titulo-quadro">
      <CabecalhoDoProjeto projetoId={projeto.id} nome={projeto.nome} tituloId="titulo-quadro" />

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Quadro da sprint {sprint.numero}</h2>
        <p className="mt-1 text-sm text-slate-700">
          {formatarData(sprint.inicio)} a {formatarData(sprint.fim)} ·{' '}
          {ROTULO_DA_SITUACAO_DA_SPRINT[sprint.situacao]}
          {sprint.diasUteisRestantes !== null &&
            ` · ${
              sprint.diasUteisRestantes === 1
                ? 'falta 1 dia útil'
                : `faltam ${sprint.diasUteisRestantes} dias úteis`
            }`}
        </p>
        <p className="mt-1 text-sm">
          <strong>Meta:</strong> {sprint.meta || 'não definida'}
        </p>
        <p className="mt-1 text-sm">
          {sprint.situacao !== 'encerrada' && (
            <>
              <Link href={`${base}/planejamento`} className={LINK}>
                Planejamento (itens da sprint)
              </Link>
              {' · '}
            </>
          )}
          {sprint.situacao !== 'planejada' && (
            <>
              <Link href={`${base}/review`} className={LINK}>
                Review e retrospectiva
              </Link>
              {' · '}
            </>
          )}
          <Link href={`/projetos/${projeto.id}/sprints`} className={LINK}>
            Todas as sprints
          </Link>
        </p>
      </div>

      {!ativa && (
        <p className="mt-4 rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm">
          {sprint.situacao === 'planejada'
            ? 'A sprint ainda não começou. Inicie-a no Planejamento para mover os cartões.'
            : 'A sprint está encerrada: o quadro é só para consulta.'}
        </p>
      )}

      <div className="mt-4 overflow-x-auto pb-2">
        <div className="grid min-w-[60rem] grid-cols-4 gap-3">
          {COLUNAS.map((coluna, posicao) => {
            const cartoes = itens.filter((item) => item.estado === coluna.estado);
            const anterior = COLUNAS[posicao - 1];
            const proxima = COLUNAS[posicao + 1];
            return (
              <section
                key={coluna.estado}
                aria-labelledby={`coluna-${coluna.estado}`}
                className="rounded-lg border border-slate-200 bg-slate-100 p-2"
              >
                <h3 id={`coluna-${coluna.estado}`} className="px-1 py-1 text-sm font-semibold">
                  {coluna.titulo}{' '}
                  <span className="font-normal text-slate-600">({cartoes.length})</span>
                </h3>
                <ul className="mt-1 space-y-2">
                  {cartoes.map((item) => {
                    const cumpridos = projeto.definicaoDePronto.filter((criterio) =>
                      item.dodMarcados.includes(criterio),
                    ).length;
                    const responsavel = nomeDe(item.responsavelId);
                    const falha = errosPorItem[item.id];
                    return (
                      <li
                        key={item.id}
                        className="rounded-md border border-slate-300 bg-white p-2 text-sm"
                      >
                        <button
                          type="button"
                          onClick={() => setAbertoId(item.id)}
                          className="text-left font-medium text-blue-800 underline underline-offset-2 hover:text-blue-950"
                        >
                          {item.titulo}
                        </button>
                        <p className="mt-1 text-xs text-slate-700">
                          {item.estimativa ?? '—'} pts{responsavel && ` · ${responsavel}`} ·{' '}
                          {cumpridos}/{projeto.definicaoDePronto.length} critérios
                        </p>
                        {item.impedido && (
                          <p className="mt-1 text-xs text-red-800">
                            <strong>Impedido:</strong> {item.impedido.motivo}
                          </p>
                        )}
                        <div className="mt-2 flex gap-1">
                          {anterior && (
                            <button
                              type="button"
                              className={BOTAO}
                              disabled={!ativa}
                              onClick={() => mover(item, anterior.estado)}
                              aria-label={`Mover ${item.titulo} para ${anterior.titulo}`}
                            >
                              ← {anterior.titulo}
                            </button>
                          )}
                          {proxima && (
                            <button
                              type="button"
                              className={BOTAO}
                              disabled={!ativa}
                              onClick={() => mover(item, proxima.estado)}
                              aria-label={`Mover ${item.titulo} para ${proxima.titulo}`}
                            >
                              {proxima.titulo} →
                            </button>
                          )}
                        </div>
                        {falha && (
                          <div className="mt-2">
                            <Aviso codigo={falha.codigo}>{falha.message}</Aviso>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {cartoes.length === 0 && (
                  <p className="px-1 py-2 text-xs text-slate-600">Nenhum cartão.</p>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {itens.length === 0 && (
        <p className="mt-2 text-slate-700">
          Nenhum item nesta sprint. Escolha os itens no{' '}
          <Link href={`${base}/planejamento`} className={LINK}>
            Planejamento
          </Link>
          .
        </p>
      )}

      <Modal
        aberto={itemAberto !== null}
        titulo={itemAberto ? itemAberto.titulo : 'Item'}
        aoFechar={() => setAbertoId(null)}
      >
        {itemAberto && (
          <>
            <DetalhesDoItem
              item={itemAberto}
              definicaoDePronto={projeto.definicaoDePronto}
              aoAlterar={() => {
                recarregarItens();
                recarregarSprint();
              }}
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setAbertoId(null)}
                className="rounded-md border border-slate-400 px-4 py-2 text-sm font-medium hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>
          </>
        )}
      </Modal>
    </section>
  );
}
