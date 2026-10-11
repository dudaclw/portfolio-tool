'use client';

import { useId, useState, type FormEvent } from 'react';
import type { AlocacaoComAvisos } from '@/aplicacao/recursos/casos-de-uso';
import type { AvisoDeSobrecarga } from '@/dominio/recursos/carga';
import type { Projeto } from '@/dominio/projetos/projeto';
import type { Alocacao, Pessoa } from '@/dominio/recursos/recursos';
import { Aviso } from './Aviso';
import { BotaoRemover } from './BotaoRemover';
import { chamarApi, ErroDaApi } from './api';
import { Campo, CLASSE_DO_CAMPO } from './Campo';
import { formatarData } from './rotulos';

const CAMPOS = ['pessoaId', 'projetoId', 'inicio', 'fim', 'percentual'];

export function SecaoDeAlocacoes({
  alocacoes,
  pessoas,
  projetos,
  aoAlterar,
}: {
  alocacoes: Alocacao[];
  pessoas: Pessoa[];
  projetos: Projeto[];
  aoAlterar: () => void;
}) {
  const prefixo = useId();
  const id = (campo: string) => `${prefixo}-${campo}`;
  const [pessoaId, setPessoaId] = useState('');
  const [projetoId, setProjetoId] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [percentual, setPercentual] = useState('100');
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState<ErroDaApi | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [avisos, setAvisos] = useState<AvisoDeSobrecarga[] | null>(null);

  const nomeDaPessoa = (alvo: string) => pessoas.find((p) => p.id === alvo)?.nome ?? '—';
  const nomeDoProjeto = (alvo: string) => projetos.find((p) => p.id === alvo)?.nome ?? '—';

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setSalvando(true);
    setErroGeral(null);
    setErros({});
    setAvisos(null);
    try {
      const criada = await chamarApi<AlocacaoComAvisos>('/alocacoes', {
        method: 'POST',
        body: JSON.stringify({
          pessoaId,
          projetoId,
          inicio,
          fim,
          percentual: percentual.trim() === '' ? 0 : Number(percentual),
        }),
      });
      setAvisos(criada.avisos);
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
    <section aria-labelledby="titulo-alocacoes" className="space-y-3">
      <h2 id="titulo-alocacoes" className="text-lg font-semibold">
        Alocações
      </h2>
      <p className="text-sm text-slate-700">
        Quanto do tempo de cada pessoa vai para cada projeto, em um período. Passar de 100% somando
        os projetos só gera um aviso.
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
          <Campo id={id('projetoId')} rotulo="Projeto" erro={erros.projetoId}>
            <select
              {...propriedades('projetoId')}
              value={projetoId}
              onChange={(e) => setProjetoId(e.target.value)}
            >
              <option value="">Escolha…</option>
              {projetos.map((p) => (
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
          <Campo id={id('percentual')} rotulo="Percentual (1 a 100)" erro={erros.percentual}>
            <input
              {...propriedades('percentual')}
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              step={1}
              value={percentual}
              onChange={(e) => setPercentual(e.target.value)}
            />
          </Campo>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={salvando}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {salvando ? 'Salvando…' : 'Adicionar alocação'}
          </button>
        </div>
      </form>

      {avisos !== null && (
        <div role="status" aria-live="polite">
          {avisos.length === 0 ? (
            <p className="text-sm text-green-800">Alocação cadastrada.</p>
          ) : (
            <div className="space-y-1 rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <p>
                <strong>Alocação cadastrada, com aviso (RN-08):</strong>
              </p>
              <ul className="list-disc pl-5">
                {avisos.map((aviso) => (
                  <li key={`${aviso.de}-${aviso.ate}`}>{aviso.mensagem}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {alocacoes.length === 0 ? (
        <p className="text-slate-700">Nenhuma alocação ainda. Aloque as pessoas aos projetos.</p>
      ) : (
        <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">Alocações das pessoas aos projetos</caption>
            <thead className="border-b border-slate-200 bg-slate-100 text-slate-700">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Pessoa
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Projeto
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Período
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Percentual
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {alocacoes.map((alocacao) => (
                <tr key={alocacao.id} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="px-3 py-2 font-medium">
                    {nomeDaPessoa(alocacao.pessoaId)}
                  </th>
                  <td className="px-3 py-2">{nomeDoProjeto(alocacao.projetoId)}</td>
                  <td className="px-3 py-2">
                    {formatarData(alocacao.inicio)} a {formatarData(alocacao.fim)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{alocacao.percentual}%</td>
                  <td className="px-3 py-2">
                    <BotaoRemover
                      rotulo={`Remover alocação de ${nomeDaPessoa(alocacao.pessoaId)} em ${nomeDoProjeto(alocacao.projetoId)}`}
                      titulo="Remover alocação"
                      aoRemover={async () => {
                        await chamarApi(`/alocacoes/${alocacao.id}`, { method: 'DELETE' });
                        aoAlterar();
                      }}
                    >
                      <p>
                        Remover a alocação de <strong>{nomeDaPessoa(alocacao.pessoaId)}</strong> em{' '}
                        <strong>{nomeDoProjeto(alocacao.projetoId)}</strong> ({alocacao.percentual}
                        %, {formatarData(alocacao.inicio)} a {formatarData(alocacao.fim)})?
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
