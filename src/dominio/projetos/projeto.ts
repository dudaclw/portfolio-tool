import { compararDatas, ehDataValida } from '../compartilhado/datas';
import { ErroDeValidacao, type ProblemaDeCampo } from '../compartilhado/erro-de-validacao';
import type { Data } from '../compartilhado/tipos';

export const STATUS_DO_PROJETO = [
  'planejado',
  'em_andamento',
  'pausado',
  'concluido',
  'cancelado',
] as const;

export type StatusProjeto = (typeof STATUS_DO_PROJETO)[number];

export const DURACAO_PADRAO_DA_SPRINT_DIAS = 15;

export const DEFINICAO_DE_PRONTO_PADRAO: readonly string[] = [
  'Critérios de aceite atendidos',
  'Testado',
  'Revisado por outra pessoa',
  'Documentação atualizada quando aplicável',
];

export interface Projeto {
  id: string;
  nome: string;
  objetivo: string;
  patrocinador?: string;
  inicio: Data;
  fimPrevisto: Data;
  status: StatusProjeto;
  /** Dias corridos. */
  duracaoSprintDias: number;
  definicaoDePronto: string[];
}

/** Campos editáveis do projeto (tudo, menos o id). */
export type DadosDoProjeto = Omit<Projeto, 'id'>;

export interface EntradaDeProjeto {
  nome: string;
  objetivo?: string;
  patrocinador?: string;
  inicio: Data;
  fimPrevisto: Data;
  status?: StatusProjeto;
  duracaoSprintDias?: number;
  definicaoDePronto?: string[];
}

export type AlteracoesDoProjeto = Partial<DadosDoProjeto>;

function textoOuNada(texto: string | undefined): string | undefined {
  const limpo = texto?.trim();
  return limpo ? limpo : undefined;
}

function validar(dados: DadosDoProjeto): void {
  const problemas: ProblemaDeCampo[] = [];

  if (dados.nome.length === 0) {
    problemas.push({ campo: 'nome', mensagem: 'Informe o nome do projeto.' });
  }
  const inicioValido = ehDataValida(dados.inicio);
  const fimValido = ehDataValida(dados.fimPrevisto);
  if (!inicioValido) {
    problemas.push({ campo: 'inicio', mensagem: 'Data de início inválida. Use AAAA-MM-DD.' });
  }
  if (!fimValido) {
    problemas.push({
      campo: 'fimPrevisto',
      mensagem: 'Data de fim previsto inválida. Use AAAA-MM-DD.',
    });
  }
  if (inicioValido && fimValido && compararDatas(dados.fimPrevisto, dados.inicio) < 0) {
    problemas.push({
      campo: 'fimPrevisto',
      mensagem: 'O fim previsto não pode ser anterior ao início do projeto.',
    });
  }
  if (!Number.isInteger(dados.duracaoSprintDias) || dados.duracaoSprintDias < 1) {
    problemas.push({
      campo: 'duracaoSprintDias',
      mensagem: 'A duração da sprint deve ser um número inteiro de dias, de 1 em diante.',
    });
  }

  if (problemas.length > 0) throw new ErroDeValidacao(problemas);
}

function normalizar(dados: DadosDoProjeto): DadosDoProjeto {
  const patrocinador = textoOuNada(dados.patrocinador);
  return {
    nome: dados.nome.trim(),
    objetivo: dados.objetivo.trim(),
    ...(patrocinador !== undefined ? { patrocinador } : {}),
    inicio: dados.inicio,
    fimPrevisto: dados.fimPrevisto,
    status: dados.status,
    duracaoSprintDias: dados.duracaoSprintDias,
    definicaoDePronto: dados.definicaoDePronto
      .map((criterio) => criterio.trim())
      .filter((criterio) => criterio.length > 0),
  };
}

/** Cria um projeto válido; lança ErroDeValidacao se algum dado estiver inconsistente. */
export function criarProjeto(id: string, entrada: EntradaDeProjeto): Projeto {
  const dados = normalizar({
    nome: entrada.nome,
    objetivo: entrada.objetivo ?? '',
    ...(entrada.patrocinador !== undefined ? { patrocinador: entrada.patrocinador } : {}),
    inicio: entrada.inicio,
    fimPrevisto: entrada.fimPrevisto,
    status: entrada.status ?? 'planejado',
    duracaoSprintDias: entrada.duracaoSprintDias ?? DURACAO_PADRAO_DA_SPRINT_DIAS,
    definicaoDePronto: entrada.definicaoDePronto ?? [...DEFINICAO_DE_PRONTO_PADRAO],
  });
  validar(dados);
  return { id, ...dados };
}

/** Aplica alterações a um projeto e revalida o resultado. Patrocinador vazio remove o campo. */
export function alterarProjeto(projeto: Projeto, alteracoes: AlteracoesDoProjeto): Projeto {
  const { id, ...atuais } = projeto;
  const dados = normalizar({ ...atuais, ...alteracoes });
  validar(dados);
  return { id, ...dados };
}
