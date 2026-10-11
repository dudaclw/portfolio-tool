'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import type { SprintDetalhada } from '@/aplicacao/sprints/casos-de-uso';
import type { ItemBacklog } from '@/dominio/backlog/item-backlog';
import { passaDaVelocityMedia, velocityMedia } from '@/dominio/metricas/velocity';
import type { Projeto } from '@/dominio/projetos/projeto';
import type { Sprint } from '@/dominio/sprints/sprint';
import { Aviso } from './Aviso';
import { CabecalhoDoProjeto } from './CabecalhoDoProjeto';
import { chamarApi, ErroDaApi } from './api';
import { CLASSE_DO_CAMPO } from './Campo';
import {
  ROTULO_DA_SITUACAO_DA_SPRINT,
  ROTULO_DO_ESTADO,
  ROTULO_DO_TIPO,
  formatarData,
  formatarPontos,
} from './rotulos';
import { useRecurso } from './use-recurso';

const LINK = 'text-blue-800 underline underline-offset-2 hover:text-blue-950';

export function PlanejamentoDaSprint({
  projetoId,
  sprintId,
}: {
  projetoId: string;
  sprintId: string;
}) {
  const { dados: projeto, erro: erroDoProjeto } = useRecurso<Projeto>(`/projetos/${projetoId}`);
  const { dados: sprint, erro: erroDaSprint } = useRecurso<SprintDetalhada>(`/sprints/${sprintId}`);
  const { dados: itens, erro: erroDosItens } = useRecurso<ItemBacklog[]>(
    `/projetos/${projetoId}/itens`,
  );
  const { dados: sprints } = useRecurso<Sprint[]>(`/projetos/${projetoId}/sprints`);

  const erro = erroDoProjeto ?? erroDaSprint ?? erroDosItens;
  if (!projeto || !sprint || !itens || !sprints) {
    return erro ? (
      <div className="space-y-3">
        <Aviso>{erro}</Aviso>
        <Link href={`/projetos/${projetoId}/sprints`} className={LINK}>
          Voltar às sprints
        </Link>
      </div>
    ) : (
      <p className="text-slate-700">Carregando planejamento…</p>
    );
  }

  return (
    <section aria-labelledby="titulo-planejamento">
      <CabecalhoDoProjeto
        projetoId={projeto.id}
        nome={projeto.nome}
        tituloId="titulo-planejamento"
      />
      <FormularioDePlanejamento
        projeto={projeto}
        sprint={sprint}
        itens={itens}
        media={velocityMedia(sprints)}
      />
    </section>
  );
}

/** Montado só depois de a sprint e os itens carregarem, para os campos já nascerem preenchidos. */
function FormularioDePlanejamento({
  projeto,
  sprint,
  itens,
  media,
}: {
  projeto: Projeto;
  sprint: SprintDetalhada;
  itens: ItemBacklog[];
  media: number | null;
}) {
  const roteador = useRouter();
  const idDaMeta = useId();
  const [meta, setMeta] = useState(sprint.meta);
  const [escolhidos, setEscolhidos] = useState<Set<string>>(
    () => new Set(sprint.itens.map((item) => item.itemId)),
  );
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<ErroDaApi | null>(null);
  const [salvo, setSalvo] = useState(false);

  const encerrada = sprint.situacao === 'encerrada';
  const ativa = sprint.situacao === 'ativa';
  const quadro = `/projetos/${projeto.id}/sprints/${sprint.id}`;

  // Itens que dá para escolher: os que já estão nesta sprint e os prontos para sprint do backlog.
  const candidatos = itens.filter(
    (item) =>
      item.sprintId === sprint.id ||
      (item.sprintId === null && item.estado === 'pronto_para_sprint'),
  );
  // Quem já está na sprint vale a estimativa planejada na hora em que entrou (RN-06).
  const planejadaDe = new Map(sprint.itens.map((item) => [item.itemId, item.estimativaPlanejada]));
  const pontosDe = (item: ItemBacklog) => planejadaDe.get(item.id) ?? item.estimativa ?? 0;
  const pontosEscolhidos = candidatos
    .filter((item) => escolhidos.has(item.id))
    .reduce((soma, item) => soma + pontosDe(item), 0);
  const passaDaMedia = passaDaVelocityMedia(pontosEscolhidos, media);

  function alternar(itemId: string, marcado: boolean) {
    setSalvo(false);
    setEscolhidos((atuais) => {
      const proximos = new Set(atuais);
      if (marcado) proximos.add(itemId);
      else proximos.delete(itemId);
      return proximos;
    });
  }

  async function salvar(): Promise<boolean> {
    setErro(null);
    setSalvo(false);
    try {
      await chamarApi<Sprint>(`/sprints/${sprint.id}/planejamento`, {
        method: 'PUT',
        body: JSON.stringify({ meta, itemIds: [...escolhidos] }),
      });
      return true;
    } catch (e) {
      if (!(e instanceof ErroDaApi)) throw e;
      setErro(e);
      return false;
    }
  }

  async function aoSalvar() {
    setOcupado(true);
    if (await salvar()) setSalvo(true);
    setOcupado(false);
  }

  async function aoIniciar() {
    setOcupado(true);
    if (await salvar()) {
      try {
        await chamarApi<Sprint>(`/sprints/${sprint.id}/iniciar`, { method: 'POST' });
        roteador.push(quadro);
        return;
      } catch (e) {
        if (!(e instanceof ErroDaApi)) throw e;
        setErro(e);
      }
    }
    setOcupado(false);
  }

  return (
    <div className="mt-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Planejamento da sprint {sprint.numero}</h2>
        <p className="mt-1 text-sm text-slate-700">
          {formatarData(sprint.inicio)} a {formatarData(sprint.fim)} ·{' '}
          {ROTULO_DA_SITUACAO_DA_SPRINT[sprint.situacao]} ·{' '}
          <Link href={`/projetos/${projeto.id}/sprints`} className={LINK}>
            Todas as sprints
          </Link>
          {sprint.situacao !== 'planejada' && (
            <>
              {' · '}
              <Link href={quadro} className={LINK}>
                Quadro
              </Link>
            </>
          )}
        </p>
      </div>

      {encerrada && (
        <p className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm">
          Esta sprint está encerrada e não pode mais ser alterada.
        </p>
      )}

      <div>
        <label htmlFor={idDaMeta} className="block text-sm font-medium">
          Meta da sprint
        </label>
        <textarea
          id={idDaMeta}
          rows={2}
          className={CLASSE_DO_CAMPO}
          value={meta}
          onChange={(e) => {
            setSalvo(false);
            setMeta(e.target.value);
          }}
          readOnly={ativa || encerrada}
          aria-describedby={ativa ? `${idDaMeta}-ajuda` : undefined}
        />
        {ativa && (
          <p id={`${idDaMeta}-ajuda`} className="mt-1 text-xs text-slate-600">
            A meta não muda com a sprint ativa. Os itens podem entrar e sair.
          </p>
        )}
      </div>

      <fieldset disabled={encerrada}>
        <legend className="text-sm font-semibold">Itens da sprint</legend>
        <p className="mt-1 text-sm text-slate-700" aria-live="polite">
          {pontosEscolhidos} {pontosEscolhidos === 1 ? 'ponto escolhido' : 'pontos escolhidos'} ·
          velocity média das últimas sprints encerradas:{' '}
          {media === null ? 'sem dados' : `${formatarPontos(media)} pontos`}
        </p>
        {passaDaMedia && (
          <p
            role="status"
            className="mt-2 rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          >
            <strong>Atenção:</strong> os {pontosEscolhidos} pontos escolhidos passam da velocity
            média ({formatarPontos(media ?? 0)}). Confira se a sprint não está carregada demais.
          </p>
        )}

        {candidatos.length === 0 ? (
          <p className="mt-3 text-sm text-slate-700">
            Nenhum item pronto para sprint. Refine itens no{' '}
            <Link href={`/projetos/${projeto.id}/backlog`} className={LINK}>
              Backlog
            </Link>{' '}
            e marque-os como &quot;Pronto para sprint&quot;.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {candidatos.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-start gap-3 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4"
                    checked={escolhidos.has(item.id)}
                    onChange={(e) => alternar(item.id, e.target.checked)}
                  />
                  <span className="grow">
                    <span className="font-medium">{item.titulo}</span>
                    <span className="block text-xs text-slate-600">
                      {ROTULO_DO_TIPO[item.tipo]}
                      {item.sprintId === sprint.id && ` · ${ROTULO_DO_ESTADO[item.estado]}`}
                      {item.estimativa === null && ' · sem estimativa (conta 0 ponto)'}
                    </span>
                  </span>
                  <span className="tabular-nums">{pontosDe(item)} pts</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {erro && <Aviso codigo={erro.codigo}>{erro.message}</Aviso>}
      {salvo && (
        <p role="status" className="text-sm text-green-800">
          Planejamento salvo.
        </p>
      )}

      {!encerrada && (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={aoSalvar}
            disabled={ocupado}
            className="rounded-md border border-slate-400 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-60"
          >
            {ativa ? 'Salvar itens' : 'Salvar planejamento'}
          </button>
          {sprint.situacao === 'planejada' && (
            <button
              type="button"
              onClick={aoIniciar}
              disabled={ocupado}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
            >
              Iniciar sprint
            </button>
          )}
        </div>
      )}
    </div>
  );
}
