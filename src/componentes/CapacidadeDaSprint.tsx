import type { CapacidadeComSprint } from '@/aplicacao/recursos/casos-de-uso';
import { formatarHoras } from './rotulos';

/** Capacidade em horas da sprint (RN-07), por pessoa e no total. */
export function CapacidadeDaSprint({ capacidade }: { capacidade: CapacidadeComSprint }) {
  return (
    <section aria-labelledby={`capacidade-${capacidade.sprintId}`}>
      <h3 id={`capacidade-${capacidade.sprintId}`} className="text-sm font-semibold">
        Capacidade da sprint: {formatarHoras(capacidade.horasTotais)} h
      </h3>
      {capacidade.pessoas.length === 0 ? (
        <p className="mt-1 text-sm text-slate-700">
          Ninguém está alocado a este projeto nesse período. Aloque pessoas na tela Equipe.
        </p>
      ) : (
        <div className="relative mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[22rem] text-left text-sm">
            <caption className="sr-only">Capacidade em horas por pessoa</caption>
            <thead className="border-b border-slate-200 bg-slate-100 text-slate-700">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Pessoa
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Dias úteis
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Horas
                </th>
              </tr>
            </thead>
            <tbody>
              {capacidade.pessoas.map((pessoa) => (
                <tr key={pessoa.pessoaId} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="px-3 py-2 font-medium">
                    {pessoa.nome}
                  </th>
                  <td className="px-3 py-2 tabular-nums">{pessoa.diasUteis}</td>
                  <td className="px-3 py-2 tabular-nums">{formatarHoras(pessoa.horas)} h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
