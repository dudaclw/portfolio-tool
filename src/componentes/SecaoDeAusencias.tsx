'use client';

import { useId, useState, type FormEvent } from 'react';
import type { Ausencia, Pessoa } from '@/dominio/recursos/recursos';
import { Aviso } from './Aviso';
import { BotaoRemover } from './BotaoRemover';
import { chamarApi, ErroDaApi } from './api';
import { Campo, CLASSE_DO_CAMPO } from './Campo';
import { formatarData } from './rotulos';

const CAMPOS = ['pessoaId', 'inicio', 'fim'];

export function SecaoDeAusencias({
  ausencias,
  pessoas,
  aoAlterar,
}: {
  ausencias: Ausencia[];
  pessoas: Pessoa[];
  aoAlterar: () => void;
}) {
  const prefixo = useId();
  const id = (campo: string) => `${prefixo}-${campo}`;
  const [pessoaId, setPessoaId] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState<ErroDaApi | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});

  const nomeDaPessoa = (alvo: string) => pessoas.find((p) => p.id === alvo)?.nome ?? '—';

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setSalvando(true);
    setErroGeral(null);
    setErros({});
    try {
      await chamarApi<Ausencia>('/ausencias', {
        method: 'POST',
        body: JSON.stringify({ pessoaId, inicio, fim }),
      });
      aoAlterar();
    } catch (e) {
      if (!(e instanceof ErroDaApi)) throw e;
      const porCampo: Record<string, string> = {};
      for (const { campo, mensagem } of e.campos) {
        if (CAMPOS.includes(campo) && !porCampo[campo]) porCampo[campo] = mensagem;
      }
      setErros(porCampo);
      setErroGeral(e);
    }
    setSalvando(false);
  }

  const propriedades = (campo: string) => ({
    id: id(campo),
    className: CLASSE_DO_CAMPO,
    'aria-invalid': erros[campo] ? true : undefined,
    'aria-describedby': erros[campo] ? `${id(campo)}-erro` : undefined,
  });

  return (
    <section aria-labelledby="titulo-ausencias" className="space-y-3">
      <h2 id="titulo-ausencias" className="text-lg font-semibold">
        Ausências
      </h2>
      <p className="text-sm text-slate-700">
        Férias, licenças e faltas: os dias úteis ausentes saem da capacidade.
      </p>

      <form
        onSubmit={enviar}
        noValidate
        className="space-y-3 rounded-lg border border-slate-200 bg-white p-3"
      >
        {erroGeral && (
          <Aviso codigo={erroGeral.codigo}>
            {Object.keys(erros).length === 0
              ? erroGeral.message
              : 'Corrija os campos indicados abaixo.'}
          </Aviso>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo id={id('pessoaId')} rotulo="Pessoa" erro={erros.pessoaId}>
            <select
              {...propriedades('pessoaId')}
              value={pessoaId}
              onChange={(e) => setPessoaId(e.target.value)}
            >
              <option value="">Escolha…</option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id={id('inicio')} rotulo="Início" erro={erros.inicio}>
            <input
              {...propriedades('inicio')}
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </Campo>
          <Campo id={id('fim')} rotulo="Fim" erro={erros.fim}>
            <input
              {...propriedades('fim')}
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
            />
          </Campo>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={salvando}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {salvando ? 'Salvando…' : 'Adicionar ausência'}
          </button>
        </div>
      </form>

      {ausencias.length === 0 ? (
        <p className="text-slate-700">Nenhuma ausência registrada.</p>
      ) : (
        <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <caption className="sr-only">Ausências</caption>
            <thead className="border-b border-slate-200 bg-slate-100 text-slate-700">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Pessoa
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Período
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {ausencias.map((ausencia) => (
                <tr key={ausencia.id} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="px-3 py-2 font-medium">
                    {nomeDaPessoa(ausencia.pessoaId)}
                  </th>
                  <td className="px-3 py-2">
                    {formatarData(ausencia.inicio)} a {formatarData(ausencia.fim)}
                  </td>
                  <td className="px-3 py-2">
                    <BotaoRemover
                      rotulo={`Remover ausência de ${nomeDaPessoa(ausencia.pessoaId)}`}
                      titulo="Remover ausência"
                      aoRemover={async () => {
                        await chamarApi(`/ausencias/${ausencia.id}`, { method: 'DELETE' });
                        aoAlterar();
                      }}
                    >
                      <p>
                        Remover a ausência de <strong>{nomeDaPessoa(ausencia.pessoaId)}</strong> de{' '}
                        {formatarData(ausencia.inicio)} a {formatarData(ausencia.fim)}?
                      </p>
                    </BotaoRemover>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
