/** Recurso inexistente. A API traduz este erro em HTTP 404. */
export class ErroNaoEncontrado extends Error {
  readonly recurso: string;
  readonly id: string;

  constructor(recurso: string, id: string) {
    super(`Não encontramos ${recurso.toLowerCase()} com o identificador ${id}.`);
    this.name = 'ErroNaoEncontrado';
    this.recurso = recurso;
    this.id = id;
  }
}

export function ehErroNaoEncontrado(erro: unknown): erro is ErroNaoEncontrado {
  return erro instanceof ErroNaoEncontrado;
}
