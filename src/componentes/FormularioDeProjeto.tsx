'use client';

import { useId, useState, type FormEvent } from 'react';
import type { Projeto, StatusProjeto } from '@/dominio/projetos/projeto';
import { Aviso } from './Aviso';
import { chamarApi, ErroDaApi } from './api';
import { Campo, CLASSE_DO_CAMPO } from './Campo';
import { ROTULO_DO_STATUS } from './rotulos';

interface PropriedadesDoFormulario {
  /** Presente na edição; ausente na criação. */
  projeto?: Projeto;
  aoSalvar: (projeto: Projeto) => void;
  aoCancelar: () => void;
}

export function FormularioDeProjeto({ projeto, aoSalvar, aoCancelar }: PropriedadesDoFormulario) {
  const prefixo = useId();
  const id = (campo: string) => `${prefixo}-${campo}`;

  const [nome, setNome] = useState(projeto?.nome ?? '');
  const [objetivo, setObjetivo] = useState(projeto?.objetivo ?? '');
  const [patrocinador, setPatrocinador] = useState(projeto?.patrocinador ?? '');
  const [inicio, setInicio] = useState(projeto?.inicio ?? '');
  const [fimPrevisto, setFimPrevisto] = useState(projeto?.fimPrevisto ?? '');
  const [status, setStatus] = useState<StatusProjeto>(projeto?.status ?? 'planejado');
  const [duracao, setDuracao] = useState(String(projeto?.duracaoSprintDias ?? 15));
  const [criterios, setCriterios] = useState(projeto?.definicaoDePronto.join('\n') ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState<ErroDaApi | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});

  const CAMPOS_DO_FORMULARIO = [
    'nome',
    'objetivo',
    'patrocinador',
    'inicio',
    'fimPrevisto',
    'status',
    'duracaoSprintDias',
    'definicaoDePronto',
  ];

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setSalvando(true);
    setErroGeral(null);
    setErros({});

    const dados = {
      nome,
      objetivo,
      inicio,
      fimPrevisto,
      status,
      duracaoSprintDias: duracao.trim() === '' ? 0 : Number(duracao),
    };
    const definicaoDePronto = criterios.split('\n');
    // Na criação, critérios em branco deixam valer a Definição de Pronto padrão.
    const corpo = projeto
      ? { ...dados, patrocinador, definicaoDePronto }
      : {
          ...dados,
          ...(patrocinador.trim() ? { patrocinador } : {}),
          ...(criterios.trim() ? { definicaoDePronto } : {}),
        };

    try {
      const salvo = await chamarApi<Projeto>(projeto ? `/projetos/${projeto.id}` : '/projetos', {
        method: projeto ? 'PATCH' : 'POST',
        body: JSON.stringify(corpo),
      });
      aoSalvar(salvo);
    } catch (erro) {
      if (!(erro instanceof ErroDaApi)) throw erro;
      const porCampo: Record<string, string> = {};
      for (const { campo, mensagem } of erro.campos) {
        if (CAMPOS_DO_FORMULARIO.includes(campo) && !porCampo[campo]) porCampo[campo] = mensagem;
      }
      setErros(porCampo);
      setErroGeral(erro);
      setSalvando(false);
    }
  }

  const propriedades = (campo: string) => ({
    id: id(campo),
    className: CLASSE_DO_CAMPO,
    'aria-invalid': erros[campo] ? true : undefined,
    'aria-describedby': erros[campo] ? `${id(campo)}-erro` : undefined,
  });

  const temErroSoltoNoTopo = erroGeral !== null && Object.keys(erros).length === 0;

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {erroGeral && (
        <Aviso codigo={erroGeral.codigo}>
          {temErroSoltoNoTopo ? erroGeral.message : 'Corrija os campos indicados abaixo.'}
        </Aviso>
      )}

      <Campo id={id('nome')} rotulo="Nome do projeto" erro={erros.nome}>
        <input
          {...propriedades('nome')}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="off"
        />
      </Campo>

      <Campo id={id('objetivo')} rotulo="Objetivo" erro={erros.objetivo}>
        <textarea
          {...propriedades('objetivo')}
          rows={3}
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value)}
        />
      </Campo>

      <Campo id={id('patrocinador')} rotulo="Patrocinador (opcional)" erro={erros.patrocinador}>
        <input
          {...propriedades('patrocinador')}
          value={patrocinador}
          onChange={(e) => setPatrocinador(e.target.value)}
          autoComplete="off"
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id={id('inicio')} rotulo="Início" erro={erros.inicio}>
          <input
            {...propriedades('inicio')}
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </Campo>
        <Campo id={id('fimPrevisto')} rotulo="Fim previsto" erro={erros.fimPrevisto}>
          <input
            {...propriedades('fimPrevisto')}
            type="date"
            value={fimPrevisto}
            onChange={(e) => setFimPrevisto(e.target.value)}
          />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id={id('status')} rotulo="Status" erro={erros.status}>
          <select
            {...propriedades('status')}
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusProjeto)}
          >
            {(Object.keys(ROTULO_DO_STATUS) as StatusProjeto[]).map((valor) => (
              <option key={valor} value={valor}>
                {ROTULO_DO_STATUS[valor]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          id={id('duracaoSprintDias')}
          rotulo="Duração da sprint (dias corridos)"
          erro={erros.duracaoSprintDias}
        >
          <input
            {...propriedades('duracaoSprintDias')}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={duracao}
            onChange={(e) => setDuracao(e.target.value)}
          />
        </Campo>
      </div>

      <Campo
        id={id('definicaoDePronto')}
        rotulo="Definição de Pronto"
        ajuda={
          projeto
            ? 'Um critério por linha.'
            : 'Um critério por linha. Em branco, vale o padrão (4 critérios).'
        }
        erro={erros.definicaoDePronto}
      >
        <textarea
          {...propriedades('definicaoDePronto')}
          rows={5}
          value={criterios}
          onChange={(e) => setCriterios(e.target.value)}
          aria-describedby={`${id('definicaoDePronto')}-ajuda`}
        />
      </Campo>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={aoCancelar}
          className="rounded-md border border-slate-400 px-4 py-2 text-sm font-medium hover:bg-slate-100"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={salvando}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {salvando ? 'Salvando…' : projeto ? 'Salvar alterações' : 'Criar projeto'}
        </button>
      </div>
    </form>
  );
}
