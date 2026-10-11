import {
  alterarItem,
  criarItem,
  impedirItem,
  liberarItem,
  marcarCriterios,
  type AlteracoesDoItem,
  type EntradaDeItem,
  type EstadoItem,
  type HistoricoEstado,
  type ItemBacklog,
} from '@/dominio/backlog/item-backlog';
import {
  compactarOrdem,
  moverItem,
  proximaOrdem,
  type DirecaoDeMovimento,
} from '@/dominio/backlog/ordenacao';
import { transicionarItem } from '@/dominio/backlog/transicao';
import { ErroDeRegra } from '@/dominio/compartilhado/erro-de-regra';
import { ErroDeValidacao } from '@/dominio/compartilhado/erro-de-validacao';
import type { Relogio } from '@/dominio/compartilhado/relogio';
import type { Projeto } from '@/dominio/projetos/projeto';
import { ErroNaoEncontrado } from '../erros';
import type {
  RepositorioHistorico,
  RepositorioItens,
  RepositorioPessoas,
  RepositorioProjetos,
  Transacao,
} from '../portas';

export interface DependenciasDeBacklog {
  projetos: RepositorioProjetos;
  pessoas: RepositorioPessoas;
  itens: RepositorioItens;
  historico: RepositorioHistorico;
  transacao: Transacao;
  agora: Relogio;
  gerarId: () => string;
}

export interface ItemComHistorico extends ItemBacklog {
  historico: HistoricoEstado[];
}

export function criarCasosDeUsoDeBacklog({
  projetos,
  pessoas,
  itens,
  historico,
  transacao,
  agora,
  gerarId,
}: DependenciasDeBacklog) {
  async function projeto(id: string): Promise<Projeto> {
    const encontrado = await projetos.obter(id);
    if (!encontrado) throw new ErroNaoEncontrado('Projeto', id);
    return encontrado;
  }

  async function item(id: string): Promise<ItemBacklog> {
    const encontrado = await itens.obter(id);
    if (!encontrado) throw new ErroNaoEncontrado('Item', id);
    return encontrado;
  }

  async function exigirResponsavelExistente(responsavelId: string | null | undefined) {
    if (responsavelId && !(await pessoas.obter(responsavelId))) {
      throw new ErroDeValidacao([
        { campo: 'responsavelId', mensagem: 'Essa pessoa não está cadastrada.' },
      ]);
    }
  }

  return {
    /** Itens do projeto na ordem do backlog. */
    async listarPorProjeto(projetoId: string): Promise<ItemBacklog[]> {
      await projeto(projetoId);
      return itens.listarPorProjeto(projetoId);
    },

    async obter(id: string): Promise<ItemComHistorico> {
      const encontrado = await item(id);
      return { ...encontrado, historico: await historico.listarPorItem(id) };
    },

    /** O item novo entra no fim do backlog, no estado `novo`, e já abre o histórico. */
    async criar(projetoId: string, entrada: EntradaDeItem): Promise<ItemBacklog> {
      await projeto(projetoId);
      await exigirResponsavelExistente(entrada.responsavelId);
      return transacao.executar(async () => {
        const ordem = proximaOrdem(await itens.listarPorProjeto(projetoId));
        const criado = criarItem(gerarId(), projetoId, entrada, ordem);
        await itens.salvar(criado);
        await historico.adicionar({ itemId: criado.id, de: null, para: 'novo', em: agora() });
        return criado;
      });
    },

    async editar(id: string, alteracoes: AlteracoesDoItem): Promise<ItemBacklog> {
      return transacao.executar(async () => {
        const atual = await item(id);
        await exigirResponsavelExistente(alteracoes.responsavelId);
        const atualizado = alterarItem(atual, alteracoes);
        await itens.salvar(atualizado);
        return atualizado;
      });
    },

    /** Só remove item fora de sprint; leva o histórico junto e fecha a lacuna na ordem. */
    async remover(id: string): Promise<void> {
      await transacao.executar(async () => {
        const removido = await item(id);
        if (removido.sprintId !== null) {
          throw new ErroDeRegra(
            'ITEM-EM-SPRINT',
            'Só é possível remover um item que não está em uma sprint. Tire o item da sprint antes.',
          );
        }
        await itens.remover(id);
        await historico.removerDoItem(id);
        const restantes = await itens.listarPorProjeto(removido.projetoId);
        for (const alterado of compactarOrdem(restantes)) await itens.salvar(alterado);
      });
    },

    /** Troca de posição com o vizinho; na ponta da lista não há o que fazer. */
    async mover(id: string, direcao: DirecaoDeMovimento): Promise<ItemBacklog[]> {
      return transacao.executar(async () => {
        const atual = await item(id);
        const todos = await itens.listarPorProjeto(atual.projetoId);
        for (const alterado of moverItem(todos, id, direcao)) await itens.salvar(alterado);
        return itens.listarPorProjeto(atual.projetoId);
      });
    },

    /** RN-04 vale aqui. Toda mudança de estado grava um registro de histórico. */
    async transicionar(id: string, para: EstadoItem): Promise<ItemBacklog> {
      return transacao.executar(async () => {
        const atual = await item(id);
        const { definicaoDePronto } = await projeto(atual.projetoId);
        const { item: depois, registro } = transicionarItem(
          atual,
          para,
          definicaoDePronto,
          agora(),
        );
        await itens.salvar(depois);
        await historico.adicionar(registro);
        return depois;
      });
    },

    async definirCriteriosCumpridos(id: string, marcados: string[]): Promise<ItemBacklog> {
      return transacao.executar(async () => {
        const atual = await item(id);
        const { definicaoDePronto } = await projeto(atual.projetoId);
        const atualizado = marcarCriterios(atual, marcados, definicaoDePronto);
        await itens.salvar(atualizado);
        return atualizado;
      });
    },

    async impedir(id: string, motivo: string): Promise<ItemBacklog> {
      return transacao.executar(async () => {
        const atualizado = impedirItem(await item(id), motivo, agora());
        await itens.salvar(atualizado);
        return atualizado;
      });
    },

    async liberar(id: string): Promise<ItemBacklog> {
      return transacao.executar(async () => {
        const atualizado = liberarItem(await item(id));
        await itens.salvar(atualizado);
        return atualizado;
      });
    },
  };
}

export type CasosDeUsoDeBacklog = ReturnType<typeof criarCasosDeUsoDeBacklog>;
