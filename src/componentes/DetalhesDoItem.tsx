'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import type { ItemComHistorico } from '@/aplicacao/backlog/casos-de-uso';
import type { ItemBacklog } from '@/dominio/backlog/item-backlog';
import { Aviso } from './Aviso';
import { chamarApi, ErroDaApi } from './api';
import { CLASSE_DO_CAMPO } from './Campo';
import { ROTULO_DO_ESTADO, formatarInstante } from './rotulos';
import { useRecurso } from './use-recurso';

interface PropriedadesDosDetalhes {
  item: ItemBacklog;
  definicaoDePronto: string[];
  /** Avisa a tela que o item mudou (para atualizar a lista). */
  aoAlterar: () => void;
}

/** Definição de Pronto, impedimento e histórico de estados do item, dentro da janela de edição. */
export function DetalhesDoItem({
  item: itemDaLista,
  definicaoDePronto,
  aoAlterar,
}: PropriedadesDosDetalhes) {
  const prefixo = useId();
  const { dados: detalhes, recarregar } = useRecurso<ItemComHistorico>(`/itens/${itemDaLista.id}`);
  // Última resposta da API para este item: critérios e impedimento só mudam por esta seção, então
  // ela é mais atual que a lista, que ainda está recarregando.
  const [resposta, setResposta] = useState<ItemBacklog | null>(null);
  const item = resposta ?? itemDaLista;
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<ErroDaApi | null>(null);

  // Critérios marcados: mostrados já no clique e enviados em fila, uma requisição por vez, para
  // cliques seguidos não partirem de dados desatualizados e desfazerem uns aos outros.
  const [marcados, setMarcados] = useState(itemDaLista.dodMarcados);
  const marcadosRef = useRef(itemDaLista.dodMarcados);
  const fila = useRef<Promise<unknown>>(Promise.resolve());
  const pendentes = useRef(0);

  function enfileirar(acao: () => Promise<ItemBacklog>) {
    pendentes.current += 1;
    fila.current = fila.current.then(async () => {
      setErro(null);
      try {
        const atualizado = await acao();
        setResposta(atualizado);
        recarregar();
        aoAlterar();
        // Com outras requisições na fila, a resposta é intermediária: o que está na tela já é mais novo.
        if (pendentes.current === 1) sincronizarCriterios(atualizado.dodMarcados);
      } catch (e) {
        if (!(e instanceof ErroDaApi)) throw e;
        setErro(e);
        if (pendentes.current === 1) sincronizarCriterios((resposta ?? itemDaLista).dodMarcados);
      } finally {
        pendentes.current -= 1;
      }
    });
    return fila.current;
  }

  function sincronizarCriterios(confirmados: string[]) {
    marcadosRef.current = confirmados;
    setMarcados(confirmados);
  }

  function alternarCriterio(criterio: string, marcado: boolean) {
    const proximos = marcado
      ? [...marcadosRef.current, criterio]
      : marcadosRef.current.filter((c) => c !== criterio);
    marcadosRef.current = proximos;
    setMarcados(proximos);
    return enfileirar(() =>
      chamarApi<ItemBacklog>(`/itens/${item.id}/definicao-de-pronto`, {
        method: 'PUT',
        body: JSON.stringify({ marcados: proximos }),
      }),
    );
  }

  function impedir(evento: FormEvent) {
    evento.preventDefault();
    return enfileirar(async () => {
      const atualizado = await chamarApi<ItemBacklog>(`/itens/${item.id}/impedimento`, {
        method: 'PUT',
        body: JSON.stringify({ motivo }),
      });
      setMotivo('');
      return atualizado;
    });
  }

  const liberar = () =>
    enfileirar(() => chamarApi<ItemBacklog>(`/itens/${item.id}/impedimento`, { method: 'DELETE' }));

  return (
    <div className="mt-6 space-y-6 border-t border-slate-200 pt-4">
      {erro && <Aviso codigo={erro.codigo}>{erro.message}</Aviso>}

      <fieldset>
        <legend className="text-sm font-semibold">Definição de Pronto</legend>
        {definicaoDePronto.length === 0 ? (
          <p className="mt-2 text-sm text-slate-700">O projeto não tem critérios definidos.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {definicaoDePronto.map((criterio, indice) => (
              <li key={criterio}>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4"
                    checked={marcados.includes(criterio)}
                    onChange={(e) => alternarCriterio(criterio, e.target.checked)}
                    id={`${prefixo}-dod-${indice}`}
                  />
                  {criterio}
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <section aria-labelledby={`${prefixo}-impedimento`}>
        <h3 id={`${prefixo}-impedimento`} className="text-sm font-semibold">
          Impedimento
        </h3>
        {item.impedido ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p>
              <strong>Impedido</strong> desde {formatarInstante(item.impedido.desde)}:{' '}
              {item.impedido.motivo}
            </p>
            <button
              type="button"
              onClick={liberar}
              className="rounded-md border border-slate-400 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
            >
              Remover impedimento
            </button>
          </div>
        ) : (
          <form onSubmit={impedir} className="mt-2 flex flex-wrap items-end gap-2">
            <div className="grow">
              <label htmlFor={`${prefixo}-motivo`} className="block text-sm">
                Motivo do impedimento
              </label>
              <input
                id={`${prefixo}-motivo`}
                className={CLASSE_DO_CAMPO}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              className="rounded-md border border-slate-400 px-3 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Marcar como impedido
            </button>
          </form>
        )}
      </section>

      <section aria-labelledby={`${prefixo}-historico`}>
        <h3 id={`${prefixo}-historico`} className="text-sm font-semibold">
          Histórico de estados
        </h3>
        <ol className="mt-2 space-y-1 text-sm">
          {(detalhes?.historico ?? []).map((registro, indice) => (
            <li key={indice}>
              {formatarInstante(registro.em)}:{' '}
              {registro.de ? `${ROTULO_DO_ESTADO[registro.de]} → ` : 'Criado como '}
              <strong className="font-medium">{ROTULO_DO_ESTADO[registro.para]}</strong>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
