import type { CargaDaEquipe } from '@/aplicacao/recursos/casos-de-uso';
import { formatarData } from './rotulos';

/** Pessoa × semana com o pico de alocação; acima de 100% destaca com texto e cor (RN-08). */
export function MapaDeCargaDaEquipe({ carga }: { carga: CargaDaEquipe }) {
  return (
    <section aria-labelledby="titulo-carga" className="space-y-3">
      <h2 id="titulo-carga" className="text-lg font-semibold">
        Mapa de carga
      </h2>
      <p className="text-sm text-slate-700">
        Maior soma de alocações de cada pessoa em um dia da semana (segunda a domingo), de{' '}
        {formatarData(carga.de)} a {formatarData(carga.ate)}.
      </p>

      {carga.avisos.length > 0 && (
        <div
          role="status"
          className="space-y-1 rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          <p>
            <strong>Sobrecarga (RN-08):</strong>
          </p>
          <ul className="list-disc pl-5">
            {carga.avisos.map((aviso) => (
              <li key={`${aviso.pessoaId}-${aviso.de}`}>{aviso.mensagem}</li>
            ))}
          </ul>
        </div>
      )}

      {carga.pessoas.length === 0 ? (
        <p className="text-slate-700">Cadastre pessoas e alocações para ver o mapa de carga.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Pico de alocação por pessoa e por semana</caption>
            <thead className="border-b border-slate-200 bg-slate-100 text-slate-700">
              <tr>
                <th scope="col" className="sticky left-0 bg-slate-100 px-3 py-2 font-medium">
                  Pessoa
                </th>
                {carga.semanas.map((semana) => (
                  <th
                    key={semana}
                    scope="col"
                    className="px-2 py-2 text-center font-medium tabular-nums"
                  >
                    <span className="sr-only">Semana de </span>
                    {formatarData(semana).slice(0, 5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carga.pessoas.map((pessoa) => (
                <tr key={pessoa.pessoaId} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="sticky left-0 bg-white px-3 py-2 font-medium">
                    {pessoa.nome}
                  </th>
                  {pessoa.semanas.map((semana) => {
                    const acima = semana.pico > 100;
                    return (
                      <td
                        key={semana.inicio}
                        className={
                          'px-2 py-2 text-center tabular-nums ' +
                          (acima ? 'bg-red-100 font-semibold text-red-900' : '')
                        }
                      >
                        {semana.pico === 0 ? (
                          <span aria-label="sem alocação">—</span>
                        ) : (
                          <>
                            {acima && <span aria-hidden="true">⚠ </span>}
                            {semana.pico}%
                            {acima && <span className="sr-only"> (acima de 100%)</span>}
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
