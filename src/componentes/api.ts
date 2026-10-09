/** Cliente das rotas /api/v1. Devolve os dados ou lança ErroDaApi com a mensagem em português. */

export interface ProblemaDeCampoDaApi {
  campo: string;
  mensagem: string;
}

export class ErroDaApi extends Error {
  readonly status: number;
  readonly codigo: string | undefined;
  readonly campos: ProblemaDeCampoDaApi[];

  constructor(
    status: number,
    detail: string,
    codigo?: string,
    campos: ProblemaDeCampoDaApi[] = [],
  ) {
    super(detail);
    this.name = 'ErroDaApi';
    this.status = status;
    this.codigo = codigo;
    this.campos = campos;
  }
}

interface CorpoDeProblema {
  detail?: string;
  codigo?: string;
  erros?: ProblemaDeCampoDaApi[];
}

export async function chamarApi<T>(caminho: string, init?: RequestInit): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`/api/v1${caminho}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
      cache: 'no-store',
    });
  } catch {
    throw new ErroDaApi(0, 'Não foi possível falar com o servidor local. Ele está rodando?');
  }

  if (!resposta.ok) {
    const problema = (await resposta.json().catch(() => ({}))) as CorpoDeProblema;
    throw new ErroDaApi(
      resposta.status,
      problema.detail ?? 'Algo deu errado. Tente novamente.',
      problema.codigo,
      problema.erros ?? [],
    );
  }
  return (await resposta.json()) as T;
}
