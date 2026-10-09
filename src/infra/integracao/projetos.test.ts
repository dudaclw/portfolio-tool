import { beforeEach, describe, expect, it } from 'vitest';
import { ErroDeValidacao } from '@/dominio/compartilhado/erro-de-validacao';
import { RepositorioDeColecao } from '@/infra/comum/repositorios';
import { BancoEmMemoria } from '@/infra/memoria/banco-em-memoria';
import type { Projeto } from '@/dominio/projetos/projeto';
import { ErroNaoEncontrado } from '@/aplicacao/erros';
import {
  criarCasosDeUsoDeProjetos,
  type CasosDeUsoDeProjetos,
} from '@/aplicacao/projetos/casos-de-uso';

let casos: CasosDeUsoDeProjetos;

beforeEach(() => {
  const banco = new BancoEmMemoria();
  let n = 0;
  casos = criarCasosDeUsoDeProjetos({
    projetos: new RepositorioDeColecao<Projeto>(banco, 'projetos'),
    transacao: banco,
    gerarId: () => `p${++n}`,
  });
});

const entrada = (nome: string, inicio = '2026-09-14') => ({
  nome,
  inicio,
  fimPrevisto: '2026-12-18',
});

describe('casos de uso de projetos', () => {
  it('cria e obtém um projeto', async () => {
    const criado = await casos.criar(entrada('Portal do Cliente'));
    expect(criado.id).toBe('p1');
    expect(await casos.obter('p1')).toEqual(criado);
  });

  it('não grava projeto com fim anterior ao início', async () => {
    await expect(
      casos.criar({ nome: 'X', inicio: '2026-12-18', fimPrevisto: '2026-09-14' }),
    ).rejects.toBeInstanceOf(ErroDeValidacao);
    expect(await casos.listar()).toEqual([]);
  });

  it('lista por data de início e depois por nome', async () => {
    await casos.criar(entrada('Zebra', '2026-11-02'));
    await casos.criar(entrada('Beta', '2026-09-14'));
    await casos.criar(entrada('Alfa', '2026-09-14'));
    expect((await casos.listar()).map((p) => p.nome)).toEqual(['Alfa', 'Beta', 'Zebra']);
  });

  it('obter inexistente lança ErroNaoEncontrado', async () => {
    await expect(casos.obter('nada')).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });

  it('edita dados e status', async () => {
    await casos.criar(entrada('Portal'));
    const editado = await casos.editar('p1', { nome: 'Portal 2', status: 'em_andamento' });
    expect(editado).toMatchObject({ id: 'p1', nome: 'Portal 2', status: 'em_andamento' });
    expect(await casos.obter('p1')).toEqual(editado);
  });

  it('edição inválida não altera o projeto guardado', async () => {
    const original = await casos.criar(entrada('Portal'));
    await expect(casos.editar('p1', { fimPrevisto: '2020-01-01' })).rejects.toBeInstanceOf(
      ErroDeValidacao,
    );
    expect(await casos.obter('p1')).toEqual(original);
  });

  it('editar inexistente lança ErroNaoEncontrado', async () => {
    await expect(casos.editar('nada', { nome: 'x' })).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });
});
