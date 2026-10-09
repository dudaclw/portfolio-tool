import type { Repositorio } from '@/aplicacao/portas';
import type { Banco } from './banco';
import type { ColecaoComId, Dados } from './dados';

/**
 * Repositório genérico sobre uma coleção do Banco. Entrega e guarda cópias, para que quem usa
 * não altere o estado guardado sem chamar `salvar`.
 */
export class RepositorioDeColecao<T extends { id: string }> implements Repositorio<T> {
  constructor(
    private readonly banco: Banco,
    private readonly colecao: ColecaoComId,
  ) {}

  private itens(dados: Dados): T[] {
    return dados[this.colecao] as unknown as T[];
  }

  async listar(): Promise<T[]> {
    return structuredClone(this.itens(await this.banco.ler()));
  }

  async obter(id: string): Promise<T | null> {
    const encontrado = this.itens(await this.banco.ler()).find((item) => item.id === id);
    return encontrado ? structuredClone(encontrado) : null;
  }

  async salvar(entidade: T): Promise<void> {
    const copia = structuredClone(entidade);
    await this.banco.escrever((dados) => {
      const itens = this.itens(dados);
      const posicao = itens.findIndex((item) => item.id === copia.id);
      if (posicao >= 0) itens[posicao] = copia;
      else itens.push(copia);
    });
  }

  async remover(id: string): Promise<void> {
    await this.banco.escrever((dados) => {
      const itens = this.itens(dados);
      const posicao = itens.findIndex((item) => item.id === id);
      if (posicao >= 0) itens.splice(posicao, 1);
    });
  }
}
