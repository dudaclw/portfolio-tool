'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { SprintDetalhada } from '@/aplicacao/sprints/casos-de-uso';
import type { ItemBacklog } from '@/dominio/backlog/item-backlog';
import { calcularVelocity } from '@/dominio/metricas/velocity';
import type { Projeto } from '@/dominio/projetos/projeto';
import type { Pessoa } from '@/dominio/recursos/recursos';
import type { ItemNaSprint, Sprint } from '@/dominio/sprints/sprint';
import { Aviso } from './Aviso';
import { CabecalhoDoProjeto } from './CabecalhoDoProjeto';
import { chamarApi, ErroDaApi } from './api';
import { CLASSE_DO_CAMPO } from './Campo';
import { Confirmacao } from './Confirmacao';
import {
  ROTULO_DA_SITUACAO_DA_SPRINT,
  ROTULO_DO_ESTADO,
  formatarData,
  formatarPontos,
} from './rotulos';
import { useRecurso } from './use-recurso';

const LINK = 'text-blue-800 underline underline-offset-2 hover:text-blue-950';
const BOTAO =
  'rounded-md border border-slate-400 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-60';

type Resultado = 'aceito' | 'nao_aceito' | '';

interface LinhaDeAcao {
  /** Chave só da tela (a ação nova ainda não tem id). */
  chave: string;
  id: string | undefined;
  descricao: string;
  responsavelId: string;
  prazo: string;
  concluida: boolean;
}

export function RevisaoDaSprint({ projetoId, sprintId }: { projetoId: string; sprintId: string }) {
  const { dados: projeto, erro: erroDoProjeto } = useRecurso<Projeto>(`/projetos/${projetoId}`);
  const {
    dados: sprint,
    erro: erroDaSprint,
    recarregar: recarregarSprint,
  } = useRecurso<SprintDetalhada>(`/sprints/${sprintId}`);
  const {
    dados: itens,
    erro: erroDosItens,
    recarregar: recarregarItens,
  } = useRecurso<ItemBacklog[]>(`/projetos/${projetoId}/itens`);
  const { dados: pessoas } = useRecurso<Pessoa[]>('/pessoas');
  /** Muda a cada encerramento para os campos recomeçarem dos dados salvos. */
  const [versao, setVersao] = useState(0);

  const erro = erroDoProjeto ?? erroDaSprint ?? erroDosItens;
  if (!projeto || !sprint || !itens || !pessoas) {
    return erro ? (
      <div className="space-y-3">
        <Aviso>{erro}</Aviso>
        <Link href={`/projetos/${projetoId}/sprints`} className={LINK}>
          Voltar às sprints
        </Link>
      </div>
    ) : (
      <p className="text-slate-700">Carregando review…</p>
    );
  }

  return (
    <section aria-labelledby="titulo-review">
      <CabecalhoDoProjeto projetoId={projeto.id} nome={projeto.nome} tituloId="titulo-review" />
      <Conteudo
        key={versao}
        projeto={projeto}
        sprint={sprint}
        itensDoProjeto={itens}
        pessoas={pessoas}
        aoEncerrar={() => {
          recarregarSprint();
          recarregarItens();
          setVersao((v) => v + 1);
        }}
      />
    </section>
  );
}

function Conteudo({
  projeto,
  sprint,
  itensDoProjeto,
  pessoas,
  aoEncerrar,
}: {
  projeto: Projeto;
  sprint: SprintDetalhada;
  itensDoProjeto: ItemBacklog[];
  pessoas: Pessoa[];
  aoEncerrar: () => void;
}) {
  const quadro = `/projetos/${projeto.id}/sprints/${sprint.id}`;
  const encerrada = sprint.situacao === 'encerrada';
  const iniciada = sprint.situacao !== 'planejada';
  const itemPorId = new Map(itensDoProjeto.map((item) => [item.id, item]));

  // Review
  const [resultados, setResultados] = useState<Record<string, Resultado>>(() =>
    Object.fromEntries(sprint.itens.map((i) => [i.itemId, i.resultado ?? ''])),
  );
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>(() =>
    Object.fromEntries(sprint.itens.map((i) => [i.itemId, i.feedbackReview ?? ''])),
  );
  const [erroDoReview, setErroDoReview] = useState<ErroDaApi | null>(null);
  const [reviewSalvo, setReviewSalvo] = useState(false);

  // Retrospectiva
  const retro = sprint.retrospectiva;
  const [bem, setBem] = useState((retro?.bem ?? []).join('\n'));
  const [melhorar, setMelhorar] = useState((retro?.melhorar ?? []).join('\n'));
  const [acoes, setAcoes] = useState<LinhaDeAcao[]>(() =>
    (retro?.acoes ?? []).map((acao) => ({
      chave: acao.id,
      id: acao.id,
      descricao: acao.descricao,
      responsavelId: acao.responsavelId ?? '',
      prazo: acao.prazo ?? '',
      concluida: acao.concluida,
    })),
  );
  const [erroDaRetro, setErroDaRetro] = useState<ErroDaApi | null>(null);
  const [retroSalva, setRetroSalva] = useState(false);

  // Encerramento
  const [confirmando, setConfirmando] = useState(false);
  const [erroDoEncerramento, setErroDoEncerramento] = useState<ErroDaApi | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const corpoDoReview = () => ({
    resultados: sprint.itens.map((item) => ({
      itemId: item.itemId,
      resultado: resultados[item.itemId] || null,
      feedback: feedbacks[item.itemId] ?? '',
    })),
  });

  async function salvarReview(): Promise<boolean> {
    setErroDoReview(null);
    setReviewSalvo(false);
    try {
      await chamarApi<Sprint>(`/sprints/${sprint.id}/review`, {
        method: 'PUT',
        body: JSON.stringify(corpoDoReview()),
      });
      return true;
    } catch (e) {
      if (!(e instanceof ErroDaApi)) throw e;
      setErroDoReview(e);
      return false;
    }
  }

  async function aoSalvarReview() {
    setOcupado(true);
    if (await salvarReview()) setReviewSalvo(true);
    setOcupado(false);
  }

  async function aoSalvarRetro() {
    setOcupado(true);
    setErroDaRetro(null);
    setRetroSalva(false);
    try {
      await chamarApi<Sprint>(`/sprints/${sprint.id}/retrospectiva`, {
        method: 'PUT',
        body: JSON.stringify({
          bem: bem.split('\n'),
          melhorar: melhorar.split('\n'),
          acoes: acoes.map((acao) => ({
            ...(acao.id ? { id: acao.id } : {}),
            descricao: acao.descricao,
            responsavelId: acao.responsavelId || null,
            prazo: acao.prazo || null,
            concluida: acao.concluida,
          })),
        }),
      });
      setRetroSalva(true);
    } catch (e) {
      if (!(e instanceof ErroDaApi)) throw e;
      setErroDaRetro(e);
    }
    setOcupado(false);
  }

  async function confirmarEncerramento() {
    setOcupado(true);
    setErroDoEncerramento(null);
    try {
      if (!(await salvarReview())) {
        setConfirmando(false);
        return;
      }
      await chamarApi<Sprint>(`/sprints/${sprint.id}/encerrar`, { method: 'POST' });
      setConfirmando(false);
      aoEncerrar();
    } catch (e) {
      if (!(e instanceof ErroDaApi)) throw e;
      setErroDoEncerramento(e);
    }
    setOcupado(false);
  }

  const atualizarAcao = (chave: string, mudanca: Partial<LinhaDeAcao>) => {
    setRetroSalva(false);
    setAcoes((atuais) => atuais.map((a) => (a.chave === chave ? { ...a, ...mudanca } : a)));
  };

  // Prévia do encerramento, com o que está na tela agora.
  const comResultado: ItemNaSprint[] = sprint.itens.map((item) => ({
    ...item,
    resultado: resultados[item.itemId] || null,
  }));
  const aceitos = comResultado.filter((item) => item.resultado === 'aceito').length;
  const velocityPrevista = calcularVelocity(comResultado);
  const voltam = sprint.itens.length - aceitos;

  return (
    <div className="mt-6 space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Review e retrospectiva da sprint {sprint.numero}</h2>
        <p className="mt-1 text-sm text-slate-700">
          {formatarData(sprint.inicio)} a {formatarData(sprint.fim)} ·{' '}
          {ROTULO_DA_SITUACAO_DA_SPRINT[sprint.situacao]}
          {encerrada &&
            sprint.velocity !== null &&
            ` · velocity ${formatarPontos(sprint.velocity)}`}
        </p>
        <p className="mt-1 text-sm">
          <strong>Meta:</strong> {sprint.meta || 'não definida'}
        </p>
        <p className="mt-1 text-sm">
          <Link href={quadro} className={LINK}>
            Quadro
          </Link>
          {' · '}
          <Link href={`/projetos/${projeto.id}/sprints`} className={LINK}>
            Todas as sprints
          </Link>
        </p>
      </div>

      {!iniciada && (
        <p className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm">
          A sprint ainda não começou. O review e a retrospectiva ficam disponíveis depois que ela
          for iniciada.
        </p>
      )}

      {iniciada && (
        <>
          <section aria-labelledby="titulo-itens-review">
            <h3 id="titulo-itens-review" className="text-base font-semibold">
              Review dos itens
            </h3>
            <p className="mt-1 text-sm text-slate-700">
              Só item concluído pode ser aceito. O que não for aceito volta ao topo do backlog ao
              encerrar a sprint.
            </p>
            <fieldset disabled={encerrada} className="mt-3 space-y-3">
              <legend className="sr-only">Resultado de cada item</legend>
              {sprint.itens.length === 0 && (
                <p className="text-sm text-slate-700">Esta sprint não tem itens.</p>
              )}
              {sprint.itens.map((entrada) => {
                const item = itemPorId.get(entrada.itemId);
                const nome = item?.titulo ?? entrada.itemId;
                const concluido = item?.estado === 'concluido';
                const opcoes: { valor: Resultado; rotulo: string; desabilitada?: boolean }[] = [
                  { valor: 'aceito', rotulo: 'Aceito', desabilitada: !concluido },
                  { valor: 'nao_aceito', rotulo: 'Não aceito' },
                  { valor: '', rotulo: 'Sem resultado' },
                ];
                return (
                  <div
                    key={entrada.itemId}
                    role="group"
                    aria-label={nome}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                  >
                    <p className="font-medium">
                      {nome}{' '}
                      <span className="font-normal text-slate-600">
                        · {entrada.estimativaPlanejada} pts ·{' '}
                        {item ? ROTULO_DO_ESTADO[item.estado] : '—'}
                      </span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {opcoes.map(({ valor, rotulo, desabilitada }) => (
                        <label key={rotulo} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`resultado-${entrada.itemId}`}
                            checked={resultados[entrada.itemId] === valor}
                            disabled={desabilitada}
                            onChange={() => {
                              setReviewSalvo(false);
                              setResultados((r) => ({ ...r, [entrada.itemId]: valor }));
                            }}
                          />
                          {rotulo}
                          {desabilitada && (
                            <span className="text-xs text-slate-600">(não concluído)</span>
                          )}
                        </label>
                      ))}
                    </div>
                    <label className="mt-2 block">
                      <span className="text-xs font-medium text-slate-700">Feedback</span>
                      <input
                        className={CLASSE_DO_CAMPO}
                        value={feedbacks[entrada.itemId] ?? ''}
                        onChange={(e) => {
                          setReviewSalvo(false);
                          setFeedbacks((f) => ({ ...f, [entrada.itemId]: e.target.value }));
                        }}
                        autoComplete="off"
                      />
                    </label>
                  </div>
                );
              })}
            </fieldset>
            {erroDoReview && (
              <div className="mt-3">
                <Aviso codigo={erroDoReview.codigo}>{erroDoReview.message}</Aviso>
              </div>
            )}
            {reviewSalvo && (
              <p role="status" className="mt-3 text-sm text-green-800">
                Review salvo.
              </p>
            )}
            {!encerrada && sprint.itens.length > 0 && (
              <div className="mt-3 flex justify-end">
                <button type="button" className={BOTAO} onClick={aoSalvarReview} disabled={ocupado}>
                  Salvar review
                </button>
              </div>
            )}
          </section>

          <section aria-labelledby="titulo-retro">
            <h3 id="titulo-retro" className="text-base font-semibold">
              Retrospectiva
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                O que foi bem
                <textarea
                  rows={4}
                  className={CLASSE_DO_CAMPO}
                  value={bem}
                  onChange={(e) => {
                    setRetroSalva(false);
                    setBem(e.target.value);
                  }}
                />
                <span className="mt-1 block text-xs font-normal text-slate-600">
                  Um ponto por linha.
                </span>
              </label>
              <label className="block text-sm font-medium">
                O que melhorar
                <textarea
                  rows={4}
                  className={CLASSE_DO_CAMPO}
                  value={melhorar}
                  onChange={(e) => {
                    setRetroSalva(false);
                    setMelhorar(e.target.value);
                  }}
                />
                <span className="mt-1 block text-xs font-normal text-slate-600">
                  Um ponto por linha.
                </span>
              </label>
            </div>

            <h4 className="mt-4 text-sm font-semibold">Ações</h4>
            {acoes.length === 0 && (
              <p className="mt-1 text-sm text-slate-700">
                Nenhuma ação ainda. Adicione o que o time vai fazer para melhorar.
              </p>
            )}
            <ul className="mt-2 space-y-3">
              {acoes.map((acao, indice) => (
                <li
                  key={acao.chave}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                >
                  <label className="block">
                    <span className="font-medium">Ação {indice + 1}</span>
                    <input
                      className={CLASSE_DO_CAMPO}
                      value={acao.descricao}
                      onChange={(e) => atualizarAcao(acao.chave, { descricao: e.target.value })}
                      autoComplete="off"
                    />
                  </label>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700">Responsável</span>
                      <select
                        className={CLASSE_DO_CAMPO}
                        value={acao.responsavelId}
                        onChange={(e) =>
                          atualizarAcao(acao.chave, { responsavelId: e.target.value })
                        }
                      >
                        <option value="">Sem responsável</option>
                        {pessoas.map((pessoa) => (
                          <option key={pessoa.id} value={pessoa.id}>
                            {pessoa.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700">Prazo</span>
                      <input
                        type="date"
                        className={CLASSE_DO_CAMPO}
                        value={acao.prazo}
                        onChange={(e) => atualizarAcao(acao.chave, { prazo: e.target.value })}
                      />
                    </label>
                    <div className="flex items-end justify-between gap-2">
                      <label className="flex items-center gap-1.5 pb-2">
                        <input
                          type="checkbox"
                          checked={acao.concluida}
                          onChange={(e) =>
                            atualizarAcao(acao.chave, { concluida: e.target.checked })
                          }
                        />
                        Concluída
                      </label>
                      <button
                        type="button"
                        className="rounded-md border border-slate-400 px-3 py-2 text-xs font-medium hover:bg-slate-100"
                        onClick={() => {
                          setRetroSalva(false);
                          setAcoes((atuais) => atuais.filter((a) => a.chave !== acao.chave));
                        }}
                        aria-label={`Remover a ação ${indice + 1}`}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <button
                type="button"
                className={BOTAO}
                onClick={() => {
                  setRetroSalva(false);
                  setAcoes((atuais) => [
                    ...atuais,
                    {
                      chave: `nova-${atuais.length}-${Date.now()}`,
                      id: undefined,
                      descricao: '',
                      responsavelId: '',
                      prazo: '',
                      concluida: false,
                    },
                  ]);
                }}
              >
                Adicionar ação
              </button>
            </div>
            {erroDaRetro && (
              <div className="mt-3">
                <Aviso codigo={erroDaRetro.codigo}>{erroDaRetro.message}</Aviso>
                {erroDaRetro.campos.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-sm text-red-700">
                    {erroDaRetro.campos.map((campo) => (
                      <li key={`${campo.campo}-${campo.mensagem}`}>
                        {campo.campo.replace(
                          /^acoes\.(\d+)\..*$/,
                          (_, n: string) => `Ação ${Number(n) + 1}`,
                        )}
                        : {campo.mensagem}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {retroSalva && (
              <p role="status" className="mt-3 text-sm text-green-800">
                Retrospectiva salva.
              </p>
            )}
            <div className="mt-3 flex justify-end">
              <button type="button" className={BOTAO} onClick={aoSalvarRetro} disabled={ocupado}>
                Salvar retrospectiva
              </button>
            </div>
          </section>

          {!encerrada && (
            <section aria-labelledby="titulo-encerrar" className="border-t border-slate-200 pt-4">
              <h3 id="titulo-encerrar" className="text-base font-semibold">
                Encerrar a sprint
              </h3>
              <p className="mt-1 text-sm text-slate-700">
                Calcula a velocity com os itens aceitos e devolve os demais ao topo do backlog.
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  className="rounded-md bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-900 disabled:opacity-60"
                  onClick={() => {
                    setErroDoEncerramento(null);
                    setConfirmando(true);
                  }}
                  disabled={ocupado}
                >
                  Encerrar sprint
                </button>
              </div>
            </section>
          )}
        </>
      )}

      <Confirmacao
        aberta={confirmando}
        titulo={`Encerrar a sprint ${sprint.numero}`}
        rotuloDeConfirmar="Encerrar sprint"
        aoConfirmar={confirmarEncerramento}
        aoCancelar={() => setConfirmando(false)}
        erro={erroDoEncerramento?.message}
        codigoDoErro={erroDoEncerramento?.codigo}
        ocupada={ocupado}
      >
        <p>
          Com o review que está na tela, {aceitos} {aceitos === 1 ? 'item aceito' : 'itens aceitos'}{' '}
          somam <strong>velocity {formatarPontos(velocityPrevista)}</strong>.{' '}
          {voltam === 0
            ? 'Nenhum item volta ao backlog.'
            : `${voltam} ${voltam === 1 ? 'item volta' : 'itens voltam'} ao topo do backlog como "Pronto para sprint".`}{' '}
          Depois de encerrada, a sprint não muda mais.
        </p>
      </Confirmacao>
    </div>
  );
}
