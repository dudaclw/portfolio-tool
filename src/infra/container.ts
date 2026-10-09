import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import {
  criarCasosDeUsoDeProjetos,
  type CasosDeUsoDeProjetos,
} from '@/aplicacao/projetos/casos-de-uso';
import type { Relogio } from '@/dominio/compartilhado/relogio';
import type { Projeto } from '@/dominio/projetos/projeto';
import type { Pessoa } from '@/dominio/recursos/recursos';
import type { Repositorio, Transacao } from '@/aplicacao/portas';
import { BancoEmArquivo } from './arquivo-json/banco-em-arquivo';
import type { Banco } from './comum/banco';
import { RepositorioDeColecao } from './comum/repositorios';
import { BancoEmMemoria } from './memoria/banco-em-memoria';
import { criarRelogio } from './relogio';

/**
 * Único lugar que sabe qual armazenamento concreto está em uso. Trocar o modo de armazenamento
 * no futuro é mudar a escolha abaixo e acrescentar um adaptador.
 */

export type Armazenamento = { tipo: 'memoria' } | { tipo: 'arquivo'; caminho: string };

export interface OpcoesDoContainer {
  armazenamento: Armazenamento;
  relogio?: Relogio;
  gerarId?: () => string;
}

export interface Container {
  agora: Relogio;
  transacao: Transacao;
  repositorios: {
    projetos: Repositorio<Projeto>;
    pessoas: Repositorio<Pessoa>;
  };
  projetos: CasosDeUsoDeProjetos;
  /** Acesso ao armazenamento, para o seed e para testes. */
  banco: Banco;
}

export function criarContainer(opcoes: OpcoesDoContainer): Container {
  const banco: Banco =
    opcoes.armazenamento.tipo === 'arquivo'
      ? new BancoEmArquivo(opcoes.armazenamento.caminho)
      : new BancoEmMemoria();
  const agora = opcoes.relogio ?? criarRelogio();
  const gerarId = opcoes.gerarId ?? randomUUID;

  const repositorios = {
    projetos: new RepositorioDeColecao<Projeto>(banco, 'projetos'),
    pessoas: new RepositorioDeColecao<Pessoa>(banco, 'pessoas'),
  };

  return {
    agora,
    transacao: banco,
    repositorios,
    projetos: criarCasosDeUsoDeProjetos({
      projetos: repositorios.projetos,
      transacao: banco,
      gerarId,
    }),
    banco,
  };
}

export function caminhoPadraoDosDados(): string {
  return join(process.cwd(), 'data', 'dados.json');
}

// Uma única instância por processo: o cache em memória do arquivo precisa ser compartilhado por
// todas as rotas e sobreviver ao recarregamento a quente do Next.js em desenvolvimento.
const CHAVE_GLOBAL = Symbol.for('portfolio-report.container');
type ComContainer = typeof globalThis & { [CHAVE_GLOBAL]?: Container };

export function obterContainer(): Container {
  const global = globalThis as ComContainer;
  global[CHAVE_GLOBAL] ??= criarContainer({
    armazenamento: { tipo: 'arquivo', caminho: caminhoPadraoDosDados() },
  });
  return global[CHAVE_GLOBAL];
}

/** Troca o container do processo (testes de integração das rotas usam o de memória). */
export function definirContainer(container: Container | undefined): void {
  (globalThis as ComContainer)[CHAVE_GLOBAL] = container;
}
