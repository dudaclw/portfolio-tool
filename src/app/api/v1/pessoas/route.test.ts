import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarContainer, definirContainer, obterContainer } from '@/infra/container';
import { GET } from './route';

beforeEach(() => definirContainer(criarContainer({ armazenamento: { tipo: 'memoria' } })));
afterEach(() => definirContainer(undefined));

describe('GET /api/v1/pessoas', () => {
  it('lista vazia no começo; depois, em ordem alfabética', async () => {
    expect(await (await GET()).json()).toEqual([]);
    const { pessoas } = obterContainer().repositorios;
    await pessoas.salvar({ id: '2', nome: 'Bruno', funcao: 'Dev', jornadaSemanalHoras: 40 });
    await pessoas.salvar({ id: '1', nome: 'Ana', funcao: 'Dev', jornadaSemanalHoras: 40 });
    const resposta = await GET();
    expect(resposta.status).toBe(200);
    expect((await resposta.json()).map((p: { nome: string }) => p.nome)).toEqual(['Ana', 'Bruno']);
  });
});
