'use client';

import { useId, useState, type FormEvent } from 'react';
import type { Feriado } from '@/dominio/recursos/recursos';
import { Aviso } from './Aviso';
import { BotaoRemover } from './BotaoRemover';
import { chamarApi, ErroDaApi } from './api';
import { Campo, CLASSE_DO_CAMPO } from './Campo';
import { formatarData } from './rotulos';

const CAMPOS = ['data', 'nome'];

export function SecaoDeFeriados({
  feriados,
  aoAlterar,
}: {
  feriados: Feriado[];
  aoAlterar: () => void;
}) {
  const prefixo = useId();
  const id = (campo: string) => `${prefixo}-${campo}`;
  const [data, setData] = useState('');
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState<ErroDaApi | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setSalvando(true);
    setErroGeral(null);
    setErros({});
    try {
      await chamarApi<Feriado>('/feriados', {
        method: 'POST',
        body: JSON.stringify({ data, nome }),
      });
      setNome('');
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
    <section aria-labelledby="titulo-feriados" className="space-y-3">
      <h2 id="titulo-feriados" className="text-lg font-semibold">
        Feriados
      </h2>
      <p className="text-sm text-slate-700">
        Os dias de feriado não contam como dias úteis na capacidade e no quadro.
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
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id={id('data')} rotulo="Data" erro={erros.data}>
            <input
              {...propriedades('data')}
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </Campo>
          <Campo id={id('nome')} rotulo="Nome" erro={erros.nome}>
            <input
              {...propriedades('nome')}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="off"
            />
          </Campo>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={salvando}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {salvando ? 'Salvando…' : 'Adicionar feriado'}
          </button>
        </div>
      </form>

      {feriados.length === 0 ? (
        <p className="text-slate-700">Nenhum feriado cadastrado.</p>
      ) : (
        <div className="relative max-h-96 overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[24rem] text-left text-sm">
            <caption className="sr-only">Feriados</caption>
            <thead className="sticky top-0 border-b border-slate-200 bg-slate-100 text-slate-700">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Data
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Nome
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {feriados.map((feriado) => (
                <tr key={feriado.data} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="px-3 py-2 font-medium tabular-nums">
                    {formatarData(feriado.data)}
                  </th>
                  <td className="px-3 py-2">{feriado.nome}</td>
                  <td className="px-3 py-2">
                    <BotaoRemover
                      rotulo={`Remover feriado ${feriado.nome} de ${formatarData(feriado.data)}`}
                      titulo="Remover feriado"
                      aoRemover={async () => {
                        await chamarApi(`/feriados/${feriado.data}`, { method: 'DELETE' });
                        aoAlterar();
                      }}
                    >
                      <p>
                        Remover o feriado <strong>{feriado.nome}</strong> (
                        {formatarData(feriado.data)})? Esse dia volta a contar como dia útil.
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
