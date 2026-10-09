/**
 * Violação de regra de negócio. `codigo` identifica a regra (por exemplo 'RN-02')
 * e `mensagem` é o texto em português mostrado ao usuário.
 * A API traduz este erro em HTTP 409 (application/problem+json).
 */
export class ErroDeRegra extends Error {
  readonly codigo: string;

  constructor(codigo: string, mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeRegra';
    this.codigo = codigo;
  }

  get mensagem(): string {
    return this.message;
  }
}

export function ehErroDeRegra(erro: unknown): erro is ErroDeRegra {
  return erro instanceof ErroDeRegra;
}
