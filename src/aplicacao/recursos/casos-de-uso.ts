import { ErroDeValidacao } from '@/dominio/compartilhado/erro-de-validacao';
import {
  compararDatas,
  diasEntre,
  ehDataValida,
  segundaDaSemana,
  somarDias,
} from '@/dominio/compartilhado/datas';
import { hoje, type Relogio } from '@/dominio/compartilhado/relogio';
import type { Data } from '@/dominio/compartilhado/tipos';
import {
  criarAlocacao,
  criarAusencia,
  type EntradaDeAlocacao,
  type EntradaDeAusencia,
} from '@/dominio/recursos/alocacao';
import { capacidadeDaSprint, type CapacidadeDaSprint } from '@/dominio/recursos/capacidade';
import {
  avisosDeSobrecarga,
  mapaDeCarga,
  type AvisoDeSobrecarga,
  type MapaDeCarga,
} from '@/dominio/recursos/carga';
import { criarFeriado } from '@/dominio/recursos/feriados';
import {
  alterarPessoa,
  criarPessoa,
  type AlteracoesDaPessoa,
  type EntradaDePessoa,
} from '@/dominio/recursos/pessoa';
import type { Alocacao, Ausencia, Feriado, Pessoa } from '@/dominio/recursos/recursos';
import { ErroNaoEncontrado } from '../erros';
import type {
  Repositorio,
  RepositorioAlocacoes,
  RepositorioAusencias,
  RepositorioFeriados,
  RepositorioItens,
  RepositorioPessoas,
  RepositorioProjetos,
  RepositorioSprints,
  Transacao,
} from '../portas';

export interface DependenciasDeRecursos {
  pessoas: RepositorioPessoas;
  alocacoes: RepositorioAlocacoes;
  ausencias: RepositorioAusencias;
  feriados: RepositorioFeriados;
  projetos: RepositorioProjetos;
  sprints: RepositorioSprints;
  itens: RepositorioItens;
  transacao: Transacao;
  agora: Relogio;
  gerarId: () => string;
}

export type AlocacaoComAvisos = Alocacao & { avisos: AvisoDeSobrecarga[] };

export interface CargaDaEquipe extends MapaDeCarga {
  de: Data;
  ate: Data;
  avisos: AvisoDeSobrecarga[];
}

export interface CapacidadeComSprint extends CapacidadeDaSprint {
  sprintId: string;
  projetoId: string;
  inicio: Data;
  fim: Data;
}

/** Janela padrão do mapa de carga: 12 semanas a partir da segunda-feira da semana atual. */
const SEMANAS_PADRAO = 12;
/** Teto da janela do mapa de carga, para uma consulta não varrer anos de dias. */
const MAXIMO_DE_DIAS_DA_JANELA = 731;

export function criarCasosDeUsoDeRecursos({
  pessoas,
  alocacoes,
  ausencias,
  feriados,
  projetos,
  sprints,
  itens,
  transacao,
  agora,
  gerarId,
}: DependenciasDeRecursos) {
  async function pessoa(id: string): Promise<Pessoa> {
    const encontrada = await pessoas.obter(id);
    if (!encontrada) throw new ErroNaoEncontrado('Pessoa', id);
    return encontrada;
  }

  async function exigirPessoa(pessoaId: string): Promise<Pessoa> {
    const encontrada = await pessoas.obter(pessoaId);
    if (!encontrada) {
      throw new ErroDeValidacao([
        { campo: 'pessoaId', mensagem: 'Essa pessoa não está cadastrada.' },
      ]);
    }
    return encontrada;
  }

  async function removerPorId<T extends { id: string }>(
    repositorio: Repositorio<T>,
    id: string,
    recurso: string,
  ) {
    if (!(await repositorio.obter(id))) throw new ErroNaoEncontrado(recurso, id);
    await repositorio.remover(id);
  }

  const porInicio = <T extends { inicio: Data }>(lista: T[]) =>
    lista.sort((a, b) => compararDatas(a.inicio, b.inicio));

  async function avisosDaPessoa(dono: Pessoa, de: Data, ate: Data): Promise<AvisoDeSobrecarga[]> {
    const dela = (await alocacoes.listar()).filter((a) => a.pessoaId === dono.id);
    return avisosDeSobrecarga(dono, dela, de, ate);
  }

  return {
    pessoas: {
      /** Em ordem alfabética. */
      async listar(): Promise<Pessoa[]> {
        return (await pessoas.listar()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      },

      async criar(entrada: EntradaDePessoa): Promise<Pessoa> {
        const criada = criarPessoa(gerarId(), entrada);
        await pessoas.salvar(criada);
        return criada;
      },

      async editar(id: string, alteracoes: AlteracoesDaPessoa): Promise<Pessoa> {
        return transacao.executar(async () => {
          const atualizada = alterarPessoa(await pessoa(id), alteracoes);
          await pessoas.salvar(atualizada);
          return atualizada;
        });
      },

      /**
       * Remove a pessoa e o que depende dela: alocações e ausências são apagadas e ela deixa de ser
       * responsável por itens e por ações de retrospectiva. Tudo ou nada.
       */
      async remover(id: string): Promise<void> {
        await transacao.executar(async () => {
          await pessoa(id);
          for (const a of await alocacoes.listar())
            if (a.pessoaId === id) await alocacoes.remover(a.id);
          for (const a of await ausencias.listar())
            if (a.pessoaId === id) await ausencias.remover(a.id);
          for (const item of await itens.listar()) {
            if (item.responsavelId === id) await itens.salvar({ ...item, responsavelId: null });
          }
          for (const sprint of await sprints.listar()) {
            const retro = sprint.retrospectiva;
            if (!retro?.acoes.some((acao) => acao.responsavelId === id)) continue;
            await sprints.salvar({
              ...sprint,
              retrospectiva: {
                ...retro,
                acoes: retro.acoes.map(({ responsavelId, ...resto }) =>
                  responsavelId === id
                    ? resto
                    : { ...resto, ...(responsavelId ? { responsavelId } : {}) },
                ),
              },
            });
          }
          await pessoas.remover(id);
        });
      },
    },

    alocacoes: {
      async listar(filtros: { pessoaId?: string; projetoId?: string } = {}): Promise<Alocacao[]> {
        const todas = await alocacoes.listar();
        return porInicio(
          todas.filter(
            (a) =>
              (!filtros.pessoaId || a.pessoaId === filtros.pessoaId) &&
              (!filtros.projetoId || a.projetoId === filtros.projetoId),
          ),
        );
      },

      /** RN-08 só avisa: a alocação é gravada mesmo que a pessoa passe de 100%. */
      async criar(entrada: EntradaDeAlocacao): Promise<AlocacaoComAvisos> {
        return transacao.executar(async () => {
          const dona = await exigirPessoa(entrada.pessoaId);
          if (!(await projetos.obter(entrada.projetoId))) {
            throw new ErroDeValidacao([
              { campo: 'projetoId', mensagem: 'Esse projeto não existe.' },
            ]);
          }
          const criada = criarAlocacao(gerarId(), entrada);
          await alocacoes.salvar(criada);
          const avisos = await avisosDaPessoa(dona, criada.inicio, criada.fim);
          return { ...criada, avisos };
        });
      },

      async remover(id: string): Promise<void> {
        await removerPorId(alocacoes, id, 'Alocação');
      },
    },

    ausencias: {
      async listar(filtros: { pessoaId?: string } = {}): Promise<Ausencia[]> {
        const todas = await ausencias.listar();
        return porInicio(todas.filter((a) => !filtros.pessoaId || a.pessoaId === filtros.pessoaId));
      },

      async criar(entrada: EntradaDeAusencia): Promise<Ausencia> {
        return transacao.executar(async () => {
          await exigirPessoa(entrada.pessoaId);
          const criada = criarAusencia(gerarId(), entrada);
          await ausencias.salvar(criada);
          return criada;
        });
      },

      async remover(id: string): Promise<void> {
        await removerPorId(ausencias, id, 'Ausência');
      },
    },

    feriados: {
      listar: (): Promise<Feriado[]> => feriados.listar(),

      async criar(entrada: Feriado): Promise<Feriado> {
        return transacao.executar(async () => {
          const novo = criarFeriado(entrada);
          if (await feriados.obter(novo.data)) {
            throw new ErroDeValidacao([
              { campo: 'data', mensagem: 'Já existe um feriado nessa data.' },
            ]);
          }
          await feriados.salvar(novo);
          return novo;
        });
      },

      async remover(data: Data): Promise<void> {
        if (!(await feriados.obter(data))) throw new ErroNaoEncontrado('Feriado', data);
        await feriados.remover(data);
      },
    },

    /**
     * Mapa pessoa × semana com o pico de alocação, mais os avisos RN-08 do período.
     * Sem datas, mostra 12 semanas a partir da segunda-feira da semana atual.
     */
    async carga(janela: { de?: Data; ate?: Data } = {}): Promise<CargaDaEquipe> {
      const dataInvalida = (campo: string) =>
        new ErroDeValidacao([{ campo, mensagem: 'Data inválida. Use AAAA-MM-DD.' }]);
      if (janela.de !== undefined && !ehDataValida(janela.de)) throw dataInvalida('de');
      if (janela.ate !== undefined && !ehDataValida(janela.ate)) throw dataInvalida('ate');
      const de = janela.de ?? segundaDaSemana(hoje(agora));
      const ate = janela.ate ?? somarDias(de, SEMANAS_PADRAO * 7 - 1);
      if (compararDatas(ate, de) < 0) {
        throw new ErroDeValidacao([
          { campo: 'ate', mensagem: 'O fim não pode ser anterior ao início.' },
        ]);
      }
      if (diasEntre(de, ate) > MAXIMO_DE_DIAS_DA_JANELA) {
        throw new ErroDeValidacao([
          { campo: 'ate', mensagem: 'O período do mapa de carga pode ter no máximo 2 anos.' },
        ]);
      }

      const todasAsPessoas = await pessoas.listar();
      const todasAsAlocacoes = await alocacoes.listar();
      const avisos = todasAsPessoas
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .flatMap((p) =>
          avisosDeSobrecarga(
            p,
            todasAsAlocacoes.filter((a) => a.pessoaId === p.id),
            de,
            ate,
          ),
        );
      return { de, ate, ...mapaDeCarga(todasAsPessoas, todasAsAlocacoes, de, ate), avisos };
    },

    /** RN-07. Usa as alocações ao projeto da sprint, as ausências e os feriados cadastrados. */
    async capacidadeDaSprint(sprintId: string): Promise<CapacidadeComSprint> {
      const sprint = await sprints.obter(sprintId);
      if (!sprint) throw new ErroNaoEncontrado('Sprint', sprintId);
      const capacidade = capacidadeDaSprint({
        inicio: sprint.inicio,
        fim: sprint.fim,
        projetoId: sprint.projetoId,
        pessoas: await pessoas.listar(),
        alocacoes: await alocacoes.listar(),
        ausencias: await ausencias.listar(),
        feriados: (await feriados.listar()).map((feriado) => feriado.data),
      });
      return {
        sprintId,
        projetoId: sprint.projetoId,
        inicio: sprint.inicio,
        fim: sprint.fim,
        ...capacidade,
      };
    },
  };
}

export type CasosDeUsoDeRecursos = ReturnType<typeof criarCasosDeUsoDeRecursos>;
