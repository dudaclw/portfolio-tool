import {
  alterarProjeto,
  criarProjeto,
  type AlteracoesDoProjeto,
  type EntradaDeProjeto,
  type Projeto,
} from '@/dominio/projetos/projeto';
import { ErroNaoEncontrado } from '../erros';
import type { RepositorioProjetos, Transacao } from '../portas';

export interface DependenciasDeProjetos {
  projetos: RepositorioProjetos;
  transacao: Transacao;
  gerarId: () => string;
}

export function criarCasosDeUsoDeProjetos({
  projetos,
  transacao,
  gerarId,
}: DependenciasDeProjetos) {
  async function obter(id: string): Promise<Projeto> {
    const projeto = await projetos.obter(id);
    if (!projeto) throw new ErroNaoEncontrado('Projeto', id);
    return projeto;
  }

  return {
    /** Projetos em ordem de início (e, em empate, de nome). */
    async listar(): Promise<Projeto[]> {
      const todos = await projetos.listar();
      return todos.sort(
        (a, b) => a.inicio.localeCompare(b.inicio) || a.nome.localeCompare(b.nome, 'pt-BR'),
      );
    },

    obter,

    async criar(entrada: EntradaDeProjeto): Promise<Projeto> {
      const projeto = criarProjeto(gerarId(), entrada);
      await projetos.salvar(projeto);
      return projeto;
    },

    async editar(id: string, alteracoes: AlteracoesDoProjeto): Promise<Projeto> {
      return transacao.executar(async () => {
        const atualizado = alterarProjeto(await obter(id), alteracoes);
        await projetos.salvar(atualizado);
        return atualizado;
      });
    },
  };
}

export type CasosDeUsoDeProjetos = ReturnType<typeof criarCasosDeUsoDeProjetos>;
