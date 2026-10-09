import { AsyncLocalStorage } from 'node:async_hooks';
import type { Transacao } from '@/aplicacao/portas';
import type { Dados } from './dados';

/**
 * Núcleo comum dos dois adaptadores (memória e arquivo): guarda os dados em memória e cuida de
 * transações tudo-ou-nada e da fila de escritas. Cada adaptador só diz como carregar e persistir.
 *
 * Dentro de `executar`, leituras e escritas vão para um rascunho (cópia dos dados) visível só
 * para aquela cadeia assíncrona; o rascunho só vira o estado oficial depois de persistido com
 * sucesso. Se o trabalho ou a persistência falharem, o estado oficial não muda.
 */
export abstract class Banco implements Transacao {
  private principal: Dados | null = null;
  private carregamento: Promise<Dados> | null = null;
  private readonly contexto = new AsyncLocalStorage<Dados>();
  private fila: Promise<unknown> = Promise.resolve();

  protected abstract carregar(): Promise<Dados>;
  protected abstract persistir(dados: Dados): Promise<void>;

  private async garantirCarregado(): Promise<Dados> {
    if (this.principal) return this.principal;
    this.carregamento ??= this.carregar().then(
      (dados) => (this.principal = dados),
      (erro) => {
        this.carregamento = null; // permite tentar de novo depois de corrigir o arquivo
        throw erro;
      },
    );
    return this.carregamento;
  }

  /** Dados visíveis a quem chama: o rascunho da transação em curso ou o estado oficial. */
  async ler(): Promise<Dados> {
    return this.contexto.getStore() ?? (await this.garantirCarregado());
  }

  /** Aplica uma mutação. Fora de uma transação, ela mesma é uma transação de um passo. */
  async escrever<R>(mutacao: (dados: Dados) => R): Promise<R> {
    const rascunho = this.contexto.getStore();
    if (rascunho) return mutacao(rascunho);
    return this.executar(async () => mutacao(await this.ler()));
  }

  async executar<R>(trabalho: () => Promise<R>): Promise<R> {
    if (this.contexto.getStore()) return trabalho(); // transação aninhada participa da externa
    return this.enfileirar(async () => {
      const oficial = await this.garantirCarregado();
      const rascunho = structuredClone(oficial);
      const resultado = await this.contexto.run(rascunho, trabalho);
      await this.persistir(rascunho);
      this.principal = rascunho;
      return resultado;
    });
  }

  /** Substitui todo o conteúdo e persiste (usado pelo seed). */
  async substituirTudo(dados: Dados): Promise<void> {
    await this.enfileirar(async () => {
      const novo = structuredClone(dados);
      await this.persistir(novo);
      this.principal = novo;
      this.carregamento = Promise.resolve(novo);
    });
  }

  private enfileirar<R>(tarefa: () => Promise<R>): Promise<R> {
    const execucao = this.fila.then(tarefa);
    this.fila = execucao.then(
      () => undefined,
      () => undefined,
    );
    return execucao;
  }
}
