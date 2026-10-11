import { beforeEach, describe, expect, it } from 'vitest';
import { ErroNaoEncontrado } from '@/aplicacao/erros';
import type { CasosDeUsoDeBacklog } from '@/aplicacao/backlog/casos-de-uso';
import { ErroDeRegra } from '@/dominio/compartilhado/erro-de-regra';
import { ErroDeValidacao } from '@/dominio/compartilhado/erro-de-validacao';
import { criarContainer, type Container } from '@/infra/container';

let container: Container;
let backlog: CasosDeUsoDeBacklog;
let relogio: string;
let projetoId: string;

beforeEach(async () => {
  let n = 0;
  relogio = '2026-10-09T12:00:00Z';
  container = criarContainer({
    armazenamento: { tipo: 'memoria' },
    relogio: () => relogio,
    gerarId: () => `id${++n}`,
  });
  backlog = container.backlog;
  projetoId = (
    await container.projetos.criar({
      nome: 'Portal',
      inicio: '2026-09-14',
      fimPrevisto: '2026-12-18',
    })
  ).id;
});

const novoItem = (titulo: string, extras = {}) => backlog.criar(projetoId, { titulo, ...extras });
const titulos = async () => (await backlog.listarPorProjeto(projetoId)).map((i) => i.titulo);
const ordens = async () => (await backlog.listarPorProjeto(projetoId)).map((i) => i.ordem);

describe('criar e listar', () => {
  it('o item novo entra no fim, em `novo`, e abre o histórico com de = null', async () => {
    await novoItem('A');
    const b = await novoItem('B');
    expect(b).toMatchObject({ ordem: 2, estado: 'novo', sprintId: null });
    expect(await titulos()).toEqual(['A', 'B']);
    expect((await backlog.obter(b.id)).historico).toEqual([
      { itemId: b.id, de: null, para: 'novo', em: '2026-10-09T12:00:00Z' },
    ]);
  });

  it('projeto inexistente: 404 ao criar e ao listar', async () => {
    await expect(backlog.criar('nada', { titulo: 'x' })).rejects.toBeInstanceOf(ErroNaoEncontrado);
    await expect(backlog.listarPorProjeto('nada')).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });

  it('estimativa fora da escala não grava nada, nem histórico', async () => {
    await expect(novoItem('A', { estimativa: 4 })).rejects.toBeInstanceOf(ErroDeValidacao);
    expect(await titulos()).toEqual([]);
    expect((await container.banco.ler()).historico).toEqual([]);
  });

  it('responsável precisa estar cadastrado', async () => {
    await expect(novoItem('A', { responsavelId: 'fantasma' })).rejects.toBeInstanceOf(
      ErroDeValidacao,
    );
    await container.repositorios.pessoas.salvar({
      id: 'ana',
      nome: 'Ana',
      funcao: 'Dev',
      jornadaSemanalHoras: 40,
    });
    expect((await novoItem('A', { responsavelId: 'ana' })).responsavelId).toBe('ana');
  });
});

describe('editar', () => {
  it('altera campos e rejeita estimativa 4 sem mudar o item', async () => {
    const a = await novoItem('A', { estimativa: 3 });
    expect(await backlog.editar(a.id, { titulo: 'A2', estimativa: 8 })).toMatchObject({
      titulo: 'A2',
      estimativa: 8,
    });
    await expect(backlog.editar(a.id, { estimativa: 4 })).rejects.toBeInstanceOf(ErroDeValidacao);
    expect((await backlog.obter(a.id)).estimativa).toBe(8);
  });

  it('item inexistente: 404; responsável inexistente: validação', async () => {
    await expect(backlog.editar('nada', { titulo: 'x' })).rejects.toBeInstanceOf(ErroNaoEncontrado);
    const a = await novoItem('A');
    await expect(backlog.editar(a.id, { responsavelId: 'fantasma' })).rejects.toBeInstanceOf(
      ErroDeValidacao,
    );
  });
});

describe('mover', () => {
  it('sobe e desce mantendo as posições de 1 a N', async () => {
    const [a, , c] = [await novoItem('A'), await novoItem('B'), await novoItem('C')];
    await backlog.mover(c.id, 'acima');
    expect(await titulos()).toEqual(['A', 'C', 'B']);
    await backlog.mover(a.id, 'abaixo');
    expect(await titulos()).toEqual(['C', 'A', 'B']);
    expect(await ordens()).toEqual([1, 2, 3]);
  });

  it('na ponta é um no-op e devolve a lista', async () => {
    const a = await novoItem('A');
    await novoItem('B');
    const lista = await backlog.mover(a.id, 'acima');
    expect(lista.map((i) => i.titulo)).toEqual(['A', 'B']);
  });

  it('item inexistente: 404', async () => {
    await expect(backlog.mover('nada', 'acima')).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });
});

describe('transicionar', () => {
  it('cada mudança de estado cria um HistoricoEstado com o instante do relógio', async () => {
    const a = await novoItem('A');
    await backlog.transicionar(a.id, 'refinado');
    relogio = '2026-10-10T08:30:00Z';
    await backlog.transicionar(a.id, 'pronto_para_sprint');
    const { estado, historico } = await backlog.obter(a.id);
    expect(estado).toBe('pronto_para_sprint');
    expect(historico.map((h) => [h.de, h.para, h.em])).toEqual([
      [null, 'novo', '2026-10-09T12:00:00Z'],
      ['novo', 'refinado', '2026-10-09T12:00:00Z'],
      ['refinado', 'pronto_para_sprint', '2026-10-10T08:30:00Z'],
    ]);
  });

  it('RN-04: com 3 de 4 critérios, concluido é recusado e nada é gravado', async () => {
    const a = await novoItem('A');
    const { definicaoDePronto } = await container.projetos.obter(projetoId);
    await backlog.definirCriteriosCumpridos(a.id, definicaoDePronto.slice(0, 3));
    await expect(backlog.transicionar(a.id, 'concluido')).rejects.toMatchObject({
      codigo: 'RN-04',
    });
    await expect(backlog.transicionar(a.id, 'concluido')).rejects.toBeInstanceOf(ErroDeRegra);
    const lido = await backlog.obter(a.id);
    expect(lido.estado).toBe('novo');
    expect(lido.historico).toHaveLength(1);
  });

  it('RN-04: com os 4 critérios marcados, conclui e grava o histórico', async () => {
    const a = await novoItem('A');
    const { definicaoDePronto } = await container.projetos.obter(projetoId);
    await backlog.definirCriteriosCumpridos(a.id, definicaoDePronto);
    expect((await backlog.transicionar(a.id, 'concluido')).estado).toBe('concluido');
    expect((await backlog.obter(a.id)).historico.at(-1)).toMatchObject({
      de: 'novo',
      para: 'concluido',
    });
  });

  it('usa a Definição de Pronto atual do projeto', async () => {
    const a = await novoItem('A');
    await container.projetos.editar(projetoId, { definicaoDePronto: ['Só este'] });
    await backlog.definirCriteriosCumpridos(a.id, ['Só este']);
    expect((await backlog.transicionar(a.id, 'concluido')).estado).toBe('concluido');
  });
});

describe('Definição de Pronto e impedimento', () => {
  it('critério fora da Definição do projeto é recusado', async () => {
    const a = await novoItem('A');
    await expect(backlog.definirCriteriosCumpridos(a.id, ['Inventado'])).rejects.toBeInstanceOf(
      ErroDeValidacao,
    );
  });

  it('marca e libera impedimento, com o instante do relógio', async () => {
    const a = await novoItem('A');
    const impedido = await backlog.impedir(a.id, 'Aguardando contrato');
    expect(impedido.impedido).toEqual({
      motivo: 'Aguardando contrato',
      desde: '2026-10-09T12:00:00Z',
    });
    expect((await backlog.liberar(a.id)).impedido).toBeNull();
  });

  it('impedimento sem motivo é recusado', async () => {
    const a = await novoItem('A');
    await expect(backlog.impedir(a.id, '  ')).rejects.toBeInstanceOf(ErroDeValidacao);
  });
});

describe('remover', () => {
  it('remove o item e o histórico, e fecha a lacuna na ordem', async () => {
    const [a, b] = [await novoItem('A'), await novoItem('B'), await novoItem('C')];
    await backlog.remover(b.id);
    expect(await titulos()).toEqual(['A', 'C']);
    expect(await ordens()).toEqual([1, 2]);
    await expect(backlog.obter(b.id)).rejects.toBeInstanceOf(ErroNaoEncontrado);
    expect((await container.banco.ler()).historico.map((h) => h.itemId)).toEqual([a.id, 'id4']);
  });

  it('só remove item fora de sprint', async () => {
    const a = await novoItem('A');
    await container.repositorios.itens.salvar({ ...a, sprintId: 'sprint-1' });
    await expect(backlog.remover(a.id)).rejects.toMatchObject({ codigo: 'ITEM-EM-SPRINT' });
    expect(await titulos()).toEqual(['A']);
  });

  it('item inexistente: 404', async () => {
    await expect(backlog.remover('nada')).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });
});
