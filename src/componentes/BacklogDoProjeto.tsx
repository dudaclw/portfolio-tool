'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import type { EstadoItem, ItemBacklog } from '@/dominio/backlog/item-backlog';
import { resumirBacklog } from '@/dominio/backlog/resumo';
import type { Projeto } from '@/dominio/projetos/projeto';
import type { Pessoa } from '@/dominio/recursos/recursos';
import { Aviso } from './Aviso';
import { CabecalhoDoProjeto } from './CabecalhoDoProjeto';
import { chamarApi, ErroDaApi } from './api';
import { Confirmacao } from './Confirmacao';
import { DetalhesDoItem } from './DetalhesDoItem';
import { FormularioDeItem } from './FormularioDeItem';
import { Modal } from './Modal';
import { ROTULO_DO_ESTADO, ROTULO_DO_TIPO } from './rotulos';
import { useRecurso } from './use-recurso';

/** Estados que a tela Backlog oferece; os demais (quadro da sprint) aparecem só como estado atual. */
const ESTADOS_DO_BACKLOG: readonly EstadoItem[] = ['novo', 'refinado', 'pronto_para_sprint'];

const BOTAO =
  'rounded-md border border-slate-400 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40';

export function BacklogDoProjeto({ projetoId }: { projetoId: string }) {
  const { dados: projeto, erro: erroDoProjeto } = useRecurso<Projeto>(`/projetos/${projetoId}`);
  const {
    carregando,
    dados: todos,
    erro: erroDaLista,
    recarregar,
  } = useRecurso<ItemBacklog[]>(`/projetos/${projetoId}/itens`);
  const { dados: pessoasDaApi } = useRecurso<Pessoa[]>('/pessoas');
  const pessoas = pessoasDaApi ?? [];

  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<ItemBacklog | null>(null);
  const [erroDeRemocao, setErroDeRemocao] = useState<ErroDaApi | null>(null);
  /** Erro da última ação em cada item, mostrado logo abaixo da linha dele. */
  const [errosPorItem, setErrosPorItem] = useState<Record<string, ErroDaApi>>({});

  // O backlog propriamente dito: itens que ainda não estão em uma sprint.
  const itens = (todos ?? []).filter((item) => item.sprintId === null);
  const resumo = resumirBacklog(itens);
  const nomeDe = (responsavelId: string | null) =>
    pessoas.find((pessoa) => pessoa.id === responsavelId)?.nome ?? '—';
  const itemEmEdicao = todos?.find((item) => item.id === editandoId) ?? null;

  async function acao(item: ItemBacklog, executar: () => Promise<unknown>) {
    setErrosPorItem((atuais) => {
      const resto = { ...atuais };
      delete resto[item.id];
      return resto;
    });
    try {
      await executar();
    } catch (erro) {
      if (!(erro instanceof ErroDaApi)) throw erro;
      setErrosPorItem((atuais) => ({ ...atuais, [item.id]: erro }));
    }
    recarregar();
  }

  const mover = (item: ItemBacklog, direcao: 'acima' | 'abaixo') =>
    acao(item, () =>
      chamarApi(`/itens/${item.id}/mover`, { method: 'POST', body: JSON.stringify({ direcao }) }),
    );

  const mudarEstado = (item: ItemBacklog, para: EstadoItem) =>
    acao(item, () =>
      chamarApi(`/itens/${item.id}/transicoes`, { method: 'POST', body: JSON.stringify({ para }) }),
    );

  async function confirmarRemocao() {
    if (!removendo) return;
    setErroDeRemocao(null);
    try {
      await chamarApi(`/itens/${removendo.id}`, { method: 'DELETE' });
      setRemovendo(null);
      recarregar();
    } catch (erro) {
      if (!(erro instanceof ErroDaApi)) throw erro;
      setErroDeRemocao(erro);
    }
  }

  if (!projeto) {
    return erroDoProjeto ? (
      <div className="space-y-3">
        <Aviso>{erroDoProjeto}</Aviso>
        <Link href="/" className="text-blue-800 underline underline-offset-2">
          Voltar ao Painel
        </Link>
      </div>
    ) : (
      <p className="text-slate-700">Carregando projeto…</p>
    );
  }

  return (
    <section aria-labelledby="titulo-backlog">
      <CabecalhoDoProjeto
        projetoId={projeto.id}
        nome={projeto.nome}
        tituloId="titulo-backlog"
        acoes={
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Novo item
          </button>
        }
      />

      <h2 className="mt-6 text-lg font-semibold">Backlog</h2>

      <div className="mt-2" aria-live="polite">
        {carregando && !todos && <p className="text-slate-700">Carregando itens…</p>}
        {erroDaLista && <Aviso>{erroDaLista}</Aviso>}

        {todos && (
          <p className="text-sm text-slate-700">
            {resumo.itens} {resumo.itens === 1 ? 'item' : 'itens'} · {resumo.totalDePontos} pontos
            no total · {resumo.pontosProntosParaSprint} pontos prontos para sprint
            {resumo.semEstimativa > 0 &&
              ` · ${resumo.semEstimativa} ${resumo.semEstimativa === 1 ? 'item sem estimativa' : 'itens sem estimativa'}`}
          </p>
        )}

        {todos && itens.length === 0 && (
          <p className="mt-4 text-slate-700">Nenhum item ainda. Crie o primeiro item do backlog.</p>
        )}

        {itens.length > 0 && (
          <div className="relative mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <caption className="sr-only">Itens do backlog, na ordem de prioridade</caption>
              <thead className="border-b border-slate-200 bg-slate-100 text-slate-700">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Pos.
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Tipo
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Título
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Pontos
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Responsável
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, indice) => {
                  const erro = errosPorItem[item.id];
                  const opcoesDeEstado = ESTADOS_DO_BACKLOG.includes(item.estado)
                    ? ESTADOS_DO_BACKLOG
                    : [...ESTADOS_DO_BACKLOG, item.estado];
                  return (
                    <ItemDaLista
                      key={item.id}
                      erro={erro}
                      linha={
                        <>
                          <td className="px-3 py-2 tabular-nums">{indice + 1}</td>
                          <td className="px-3 py-2">{ROTULO_DO_TIPO[item.tipo]}</td>
                          <th scope="row" className="px-3 py-2 font-medium">
                            <button
                              type="button"
                              onClick={() => setEditandoId(item.id)}
                              className="text-left text-blue-800 underline underline-offset-2 hover:text-blue-950"
                            >
                              {item.titulo}
                            </button>
                            {item.impedido && (
                              <p className="mt-1 text-xs font-normal text-red-800">
                                <strong>Impedido:</strong> {item.impedido.motivo}
                              </p>
                            )}
                          </th>
                          <td className="px-3 py-2 tabular-nums">{item.estimativa ?? '—'}</td>
                          <td className="px-3 py-2">
                            <label className="sr-only" htmlFor={`estado-${item.id}`}>
                              Estado de {item.titulo}
                            </label>
                            <select
                              id={`estado-${item.id}`}
                              value={item.estado}
                              onChange={(e) => mudarEstado(item, e.target.value as EstadoItem)}
                              className="rounded-md border border-slate-400 bg-white px-2 py-1 text-sm"
                            >
                              {opcoesDeEstado.map((estado) => (
                                <option key={estado} value={estado}>
                                  {ROTULO_DO_ESTADO[estado]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">{nomeDe(item.responsavelId)}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                className={BOTAO}
                                disabled={indice === 0}
                                onClick={() => mover(item, 'acima')}
                                aria-label={`Subir ${item.titulo}`}
                              >
                                ↑ Subir
                              </button>
                              <button
                                type="button"
                                className={BOTAO}
                                disabled={indice === itens.length - 1}
                                onClick={() => mover(item, 'abaixo')}
                                aria-label={`Descer ${item.titulo}`}
                              >
                                ↓ Descer
                              </button>
                              <button
                                type="button"
                                className={BOTAO}
                                onClick={() => {
                                  setErroDeRemocao(null);
                                  setRemovendo(item);
                                }}
                                aria-label={`Remover ${item.titulo}`}
                              >
                                Remover
                              </button>
                            </div>
                          </td>
                        </>
                      }
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal aberto={criando} titulo="Novo item" aoFechar={() => setCriando(false)}>
        <FormularioDeItem
          projetoId={projeto.id}
          pessoas={pessoas}
          aoCancelar={() => setCriando(false)}
          aoSalvar={() => {
            setCriando(false);
            recarregar();
          }}
        />
      </Modal>

      <Modal
        aberto={itemEmEdicao !== null}
        titulo={itemEmEdicao ? `Editar item: ${itemEmEdicao.titulo}` : 'Editar item'}
        aoFechar={() => setEditandoId(null)}
      >
        {itemEmEdicao && (
          <>
            <FormularioDeItem
              projetoId={projeto.id}
              item={itemEmEdicao}
              pessoas={pessoas}
              aoCancelar={() => setEditandoId(null)}
              aoSalvar={() => {
                setEditandoId(null);
                recarregar();
              }}
            />
            <DetalhesDoItem
              item={itemEmEdicao}
              definicaoDePronto={projeto.definicaoDePronto}
              aoAlterar={recarregar}
            />
          </>
        )}
      </Modal>

      <Confirmacao
        aberta={removendo !== null}
        titulo="Remover item"
        rotuloDeConfirmar="Remover item"
        aoConfirmar={confirmarRemocao}
        aoCancelar={() => setRemovendo(null)}
        erro={erroDeRemocao?.message}
        codigoDoErro={erroDeRemocao?.codigo}
      >
        <p>
          Remover <strong>{removendo?.titulo}</strong>? O item e o histórico dele serão apagados e
          não dá para desfazer.
        </p>
      </Confirmacao>
    </section>
  );
}

/** Linha do item e, logo abaixo, o erro da última ação nele. */
function ItemDaLista({ linha, erro }: { linha: ReactNode; erro: ErroDaApi | undefined }) {
  return (
    <>
      <tr className="border-b border-slate-100 align-top last:border-0">{linha}</tr>
      {erro && (
        <tr className="border-b border-slate-100">
          <td colSpan={7} className="px-3 pb-3">
            <Aviso codigo={erro.codigo}>{erro.message}</Aviso>
          </td>
        </tr>
      )}
    </>
  );
}
