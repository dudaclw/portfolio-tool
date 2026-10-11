import type { Pessoa } from '@/dominio/recursos/recursos';
import type { RepositorioPessoas } from '../portas';

export interface DependenciasDePessoas {
  pessoas: RepositorioPessoas;
}

/** Por enquanto só a leitura (o responsável de um item é escolhido entre elas); o cadastro chega no M5. */
export function criarCasosDeUsoDePessoas({ pessoas }: DependenciasDePessoas) {
  return {
    /** Em ordem alfabética. */
    async listar(): Promise<Pessoa[]> {
      const todas = await pessoas.listar();
      return todas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    },
  };
}

export type CasosDeUsoDePessoas = ReturnType<typeof criarCasosDeUsoDePessoas>;
