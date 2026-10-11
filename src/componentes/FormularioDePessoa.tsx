'use client';

import { useId, useState, type FormEvent } from 'react';
import type { Pessoa } from '@/dominio/recursos/recursos';
import { Aviso } from './Aviso';
import { chamarApi, ErroDaApi } from './api';
import { Campo, CLASSE_DO_CAMPO } from './Campo';

const CAMPOS = ['nome', 'funcao', 'jornadaSemanalHoras'];

export function FormularioDePessoa({
  pessoa,
  aoSalvar,
  aoCancelar,
}: {
  /** Presente na edição; ausente na criação. */
  pessoa?: Pessoa;
  aoSalvar: () => void;
  aoCancelar: () => void;
}) {
  const prefixo = useId();
  const id = (campo: string) => `${prefixo}-${campo}`;
  const [nome, setNome] = useState(pessoa?.nome ?? '');
  const [funcao, setFuncao] = useState(pessoa?.funcao ?? '');
  const [jornada, setJornada] = useState(String(pessoa?.jornadaSemanalHoras ?? 40));
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState<ErroDaApi | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setSalvando(true);
    setErroGeral(null);
    setErros({});
    try {
      await chamarApi<Pessoa>(pessoa ? `/pessoas/${pessoa.id}` : '/pessoas', {
        method: pessoa ? 'PATCH' : 'POST',
        body: JSON.stringify({
          nome,
          funcao,
          jornadaSemanalHoras: jornada.trim() === '' ? 0 : Number(jornada),
        }),
      });
      aoSalvar();
    } catch (e) {
      if (!(e instanceof ErroDaApi)) throw e;
      const porCampo: Record<string, string> = {};
      for (const { campo, mensagem } of e.campos) {
        if (CAMPOS.includes(campo) && !porCampo[campo]) porCampo[campo] = mensagem;
      }
      setErros(porCampo);
      setErroGeral(e);
      setSalvando(false);
    }
  }

  const propriedades = (campo: string) => ({
    id: id(campo),
    className: CLASSE_DO_CAMPO,
    'aria-invalid': erros[campo] ? true : undefined,
    'aria-describedby': erros[campo] ? `${id(campo)}-erro` : undefined,
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {erroGeral && (
        <Aviso codigo={erroGeral.codigo}>
          {Object.keys(erros).length === 0
            ? erroGeral.message
            : 'Corrija os campos indicados abaixo.'}
        </Aviso>
      )}
      <Campo id={id('nome')} rotulo="Nome" erro={erros.nome}>
        <input
          {...propriedades('nome')}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="off"
        />
      </Campo>
      <Campo id={id('funcao')} rotulo="Função" erro={erros.funcao}>
        <input
          {...propriedades('funcao')}
          value={funcao}
          onChange={(e) => setFuncao(e.target.value)}
          autoComplete="off"
        />
      </Campo>
      <Campo
        id={id('jornadaSemanalHoras')}
        rotulo="Jornada semanal (horas)"
        erro={erros.jornadaSemanalHoras}
        ajuda="Maior que zero. A capacidade usa a jornada ÷ 5 por dia útil."
      >
        <input
          {...propriedades('jornadaSemanalHoras')}
          type="number"
          inputMode="decimal"
          min={1}
          step="any"
          value={jornada}
          onChange={(e) => setJornada(e.target.value)}
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
          {salvando ? 'Salvando…' : pessoa ? 'Salvar alterações' : 'Cadastrar pessoa'}
        </button>
      </div>
    </form>
  );
}
