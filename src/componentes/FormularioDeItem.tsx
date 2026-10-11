'use client';

import { useId, useState, type FormEvent } from 'react';
import {
  ESCALA_DE_ESTIMATIVA,
  TIPOS_DE_ITEM,
  type ItemBacklog,
  type TipoItem,
} from '@/dominio/backlog/item-backlog';
import type { Pessoa } from '@/dominio/recursos/recursos';
import { Aviso } from './Aviso';
import { chamarApi, ErroDaApi } from './api';
import { Campo, CLASSE_DO_CAMPO } from './Campo';
import { ROTULO_DO_TIPO } from './rotulos';

interface PropriedadesDoFormulario {
  projetoId: string;
  /** Presente na edição; ausente na criação. */
  item?: ItemBacklog;
  pessoas: Pessoa[];
  aoSalvar: (item: ItemBacklog) => void;
  aoCancelar: () => void;
}

const CAMPOS = ['tipo', 'titulo', 'descricao', 'criteriosAceite', 'estimativa', 'responsavelId'];

export function FormularioDeItem({
  projetoId,
  item,
  pessoas,
  aoSalvar,
  aoCancelar,
}: PropriedadesDoFormulario) {
  const prefixo = useId();
  const id = (campo: string) => `${prefixo}-${campo}`;

  const [tipo, setTipo] = useState<TipoItem>(item?.tipo ?? 'historia');
  const [titulo, setTitulo] = useState(item?.titulo ?? '');
  const [descricao, setDescricao] = useState(item?.descricao ?? '');
  const [criterios, setCriterios] = useState(item?.criteriosAceite ?? '');
  const [estimativa, setEstimativa] = useState(
    item?.estimativa == null ? '' : String(item.estimativa),
  );
  const [responsavelId, setResponsavelId] = useState(item?.responsavelId ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState<ErroDaApi | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setSalvando(true);
    setErroGeral(null);
    setErros({});

    const corpo = {
      tipo,
      titulo,
      descricao,
      criteriosAceite: criterios,
      estimativa: estimativa === '' ? null : Number(estimativa),
      responsavelId: responsavelId === '' ? null : responsavelId,
    };

    try {
      const salvo = await chamarApi<ItemBacklog>(
        item ? `/itens/${item.id}` : `/projetos/${projetoId}/itens`,
        { method: item ? 'PATCH' : 'POST', body: JSON.stringify(corpo) },
      );
      aoSalvar(salvo);
    } catch (erro) {
      if (!(erro instanceof ErroDaApi)) throw erro;
      const porCampo: Record<string, string> = {};
      for (const { campo, mensagem } of erro.campos) {
        if (CAMPOS.includes(campo) && !porCampo[campo]) porCampo[campo] = mensagem;
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

      <Campo id={id('titulo')} rotulo="Título" erro={erros.titulo}>
        <input
          {...propriedades('titulo')}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          autoComplete="off"
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo id={id('tipo')} rotulo="Tipo" erro={erros.tipo}>
          <select
            {...propriedades('tipo')}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoItem)}
          >
            {TIPOS_DE_ITEM.map((valor) => (
              <option key={valor} value={valor}>
                {ROTULO_DO_TIPO[valor]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id={id('estimativa')} rotulo="Estimativa (pontos)" erro={erros.estimativa}>
          <select
            {...propriedades('estimativa')}
            value={estimativa}
            onChange={(e) => setEstimativa(e.target.value)}
          >
            <option value="">Sem estimativa</option>
            {ESCALA_DE_ESTIMATIVA.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id={id('responsavelId')} rotulo="Responsável" erro={erros.responsavelId}>
          <select
            {...propriedades('responsavelId')}
            value={responsavelId}
            onChange={(e) => setResponsavelId(e.target.value)}
          >
            <option value="">Sem responsável</option>
            {pessoas.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.nome}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo id={id('descricao')} rotulo="Descrição" erro={erros.descricao}>
        <textarea
          {...propriedades('descricao')}
          rows={3}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </Campo>

      <Campo id={id('criteriosAceite')} rotulo="Critérios de aceite" erro={erros.criteriosAceite}>
        <textarea
          {...propriedades('criteriosAceite')}
          rows={3}
          value={criterios}
          onChange={(e) => setCriterios(e.target.value)}
        />
      </Campo>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={aoCancelar}
          className="rounded-md border border-slate-400 px-4 py-2 text-sm font-medium hover:bg-slate-100"
        >
          {item ? 'Fechar' : 'Cancelar'}
        </button>
        <button
          type="submit"
          disabled={salvando}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {salvando ? 'Salvando…' : item ? 'Salvar alterações' : 'Criar item'}
        </button>
      </div>
    </form>
  );
}
