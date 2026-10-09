import { Banco } from '../comum/banco';
import { dadosVazios, type Dados } from '../comum/dados';

/** Adaptador em memória: usado em todos os testes; nada toca o disco. */
export class BancoEmMemoria extends Banco {
  constructor(private readonly inicial: Dados = dadosVazios()) {
    super();
  }

  protected async carregar(): Promise<Dados> {
    return structuredClone(this.inicial);
  }

  protected async persistir(): Promise<void> {
    // nada a persistir
  }
}
