'use client';

import type { CargaDaEquipe } from '@/aplicacao/recursos/casos-de-uso';
import type { Projeto } from '@/dominio/projetos/projeto';
import type { Alocacao, Ausencia, Feriado, Pessoa } from '@/dominio/recursos/recursos';
import { Aviso } from './Aviso';
import { MapaDeCargaDaEquipe } from './MapaDeCargaDaEquipe';
import { SecaoDeAlocacoes } from './SecaoDeAlocacoes';
import { SecaoDeAusencias } from './SecaoDeAusencias';
import { SecaoDeFeriados } from './SecaoDeFeriados';
import { SecaoDePessoas } from './SecaoDePessoas';
import { useRecurso } from './use-recurso';

export function PaginaDaEquipe() {
  const pessoas = useRecurso<Pessoa[]>('/pessoas');
  const projetos = useRecurso<Projeto[]>('/projetos');
  const alocacoes = useRecurso<Alocacao[]>('/alocacoes');
  const ausencias = useRecurso<Ausencia[]>('/ausencias');
  const feriados = useRecurso<Feriado[]>('/feriados');
  const carga = useRecurso<CargaDaEquipe>('/carga');

  const erro =
    pessoas.erro ??
    projetos.erro ??
    alocacoes.erro ??
    ausencias.erro ??
    feriados.erro ??
    carga.erro;
  const pronto =
    pessoas.dados &&
    projetos.dados &&
    alocacoes.dados &&
    ausencias.dados &&
    feriados.dados &&
    carga.dados;

  // Mexer em pessoas, alocações ou ausências muda o mapa de carga; feriados, não.
  const depoisDeMudarPessoas = () => {
    pessoas.recarregar();
    alocacoes.recarregar();
    ausencias.recarregar();
    carga.recarregar();
  };
  const depoisDeMudarAlocacoes = () => {
    alocacoes.recarregar();
    carga.recarregar();
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">Equipe</h1>

      {erro && (
        <div className="mt-4">
          <Aviso>{erro}</Aviso>
        </div>
      )}
      {!pronto && !erro && <p className="mt-4 text-slate-700">Carregando equipe…</p>}

      {pronto && (
        <div className="mt-6 space-y-10">
          <SecaoDePessoas pessoas={pessoas.dados!} aoAlterar={depoisDeMudarPessoas} />
          <SecaoDeAlocacoes
            alocacoes={alocacoes.dados!}
            pessoas={pessoas.dados!}
            projetos={projetos.dados!}
            aoAlterar={depoisDeMudarAlocacoes}
          />
          <MapaDeCargaDaEquipe carga={carga.dados!} />
          <SecaoDeAusencias
            ausencias={ausencias.dados!}
            pessoas={pessoas.dados!}
            aoAlterar={ausencias.recarregar}
          />
          <SecaoDeFeriados feriados={feriados.dados!} aoAlterar={feriados.recarregar} />
        </div>
      )}
    </div>
  );
}
