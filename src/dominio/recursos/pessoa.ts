import { ErroDeValidacao, type ProblemaDeCampo } from '../compartilhado/erro-de-validacao';
import type { Pessoa } from './recursos';

export interface EntradaDePessoa {
  nome: string;
  funcao?: string;
  jornadaSemanalHoras: number;
}

export type AlteracoesDaPessoa = Partial<EntradaDePessoa>;

function validar(nome: string, jornadaSemanalHoras: number): void {
  const problemas: ProblemaDeCampo[] = [];
  if (nome.length === 0) problemas.push({ campo: 'nome', mensagem: 'Informe o nome da pessoa.' });
  if (!Number.isFinite(jornadaSemanalHoras) || jornadaSemanalHoras <= 0) {
    problemas.push({
      campo: 'jornadaSemanalHoras',
      mensagem: 'A jornada semanal deve ser maior que zero.',
    });
  }
  if (problemas.length > 0) throw new ErroDeValidacao(problemas);
}

export function criarPessoa(id: string, entrada: EntradaDePessoa): Pessoa {
  const nome = entrada.nome.trim();
  validar(nome, entrada.jornadaSemanalHoras);
  return {
    id,
    nome,
    funcao: (entrada.funcao ?? '').trim(),
    jornadaSemanalHoras: entrada.jornadaSemanalHoras,
  };
}

export function alterarPessoa(pessoa: Pessoa, alteracoes: AlteracoesDaPessoa): Pessoa {
  return criarPessoa(pessoa.id, {
    nome: alteracoes.nome ?? pessoa.nome,
    funcao: alteracoes.funcao ?? pessoa.funcao,
    jornadaSemanalHoras: alteracoes.jornadaSemanalHoras ?? pessoa.jornadaSemanalHoras,
  });
}
