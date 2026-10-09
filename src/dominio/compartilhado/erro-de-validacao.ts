export interface ProblemaDeCampo {
  campo: string;
  mensagem: string;
}

/**
 * Dado de entrada inválido (formato ou consistência de um campo), em oposição a ErroDeRegra,
 * que é violação de regra de negócio. A API traduz este erro em HTTP 422.
 */
export class ErroDeValidacao extends Error {
  readonly campos: readonly ProblemaDeCampo[];

  constructor(campos: readonly ProblemaDeCampo[]) {
    super(campos[0]?.mensagem ?? 'Dados inválidos.');
    this.name = 'ErroDeValidacao';
    this.campos = campos;
  }
}

export function ehErroDeValidacao(erro: unknown): erro is ErroDeValidacao {
  return erro instanceof ErroDeValidacao;
}
