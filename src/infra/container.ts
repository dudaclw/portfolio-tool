import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import {
  criarCasosDeUsoDeBacklog,
  type CasosDeUsoDeBacklog,
} from '@/aplicacao/backlog/casos-de-uso';
import {
  criarCasosDeUsoDeSprints,
  type CasosDeUsoDeSprints,
} from '@/aplicacao/sprints/casos-de-uso';
import {
  criarCasosDeUsoDeProjetos,
  type CasosDeUsoDeProjetos,
} from '@/aplicacao/projetos/casos-de-uso';
import {
  criarCasosDeUsoDeRecursos,
  type CasosDeUsoDeRecursos,
} from '@/aplicacao/recursos/casos-de-uso';
import type { Relogio } from '@/dominio/compartilhado/relogio';
import type { Projeto } from '@/dominio/projetos/projeto';
import type { Alocacao, Ausencia, Pessoa } from '@/dominio/recursos/recursos';
import type {
  Repositorio,
  RepositorioAlocacoes,
  RepositorioAusencias,
  RepositorioFeriados,
  RepositorioHistorico,
  RepositorioItens,
  RepositorioSprints,
  Transacao,
} from '@/aplicacao/portas';
import { BancoEmArquivo } from './arquivo-json/banco-em-arquivo';
import type { Banco } from './comum/banco';
import {
  RepositorioDeColecao,
  RepositorioDeFeriados,
  RepositorioDeHistorico,
  RepositorioDeItens,
  RepositorioDeSprints,
} from './comum/repositorios';
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
    itens: RepositorioItens;
    historico: RepositorioHistorico;
    sprints: RepositorioSprints;
    feriados: RepositorioFeriados;
    alocacoes: RepositorioAlocacoes;
    ausencias: RepositorioAusencias;
  };
  projetos: CasosDeUsoDeProjetos;
  backlog: CasosDeUsoDeBacklog;
  sprints: CasosDeUsoDeSprints;
  recursos: CasosDeUsoDeRecursos;
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
    itens: new RepositorioDeItens(banco),
    historico: new RepositorioDeHistorico(banco),
    sprints: new RepositorioDeSprints(banco),
    feriados: new RepositorioDeFeriados(banco),
    alocacoes: new RepositorioDeColecao<Alocacao>(banco, 'alocacoes'),
    ausencias: new RepositorioDeColecao<Ausencia>(banco, 'ausencias'),
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
    backlog: criarCasosDeUsoDeBacklog({
      projetos: repositorios.projetos,
      pessoas: repositorios.pessoas,
      itens: repositorios.itens,
      historico: repositorios.historico,
      transacao: banco,
      agora,
      gerarId,
    }),
    sprints: criarCasosDeUsoDeSprints({
      projetos: repositorios.projetos,
      pessoas: repositorios.pessoas,
      sprints: repositorios.sprints,
      itens: repositorios.itens,
      historico: repositorios.historico,
      feriados: repositorios.feriados,
      transacao: banco,
      agora,
      gerarId,
    }),
    recursos: criarCasosDeUsoDeRecursos({
      pessoas: repositorios.pessoas,
      alocacoes: repositorios.alocacoes,
      ausencias: repositorios.ausencias,
      feriados: repositorios.feriados,
      projetos: repositorios.projetos,
      sprints: repositorios.sprints,
      itens: repositorios.itens,
      transacao: banco,
      agora,
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
