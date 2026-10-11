import { beforeEach, describe, expect, it } from 'vitest';
import { ErroNaoEncontrado } from '@/aplicacao/erros';
import { ErroDeValidacao } from '@/dominio/compartilhado/erro-de-validacao';
import { criarContainer, type Container } from '@/infra/container';

let container: Container;
let recursos: Container['recursos'];
let projetoA: string;
let projetoB: string;

beforeEach(async () => {
  let n = 0;
  container = criarContainer({
    armazenamento: { tipo: 'memoria' },
    relogio: () => '2026-10-09T12:00:00Z',
    gerarId: () => `id${++n}`,
  });
  recursos = container.recursos;
  projetoA = (
    await container.projetos.criar({ nome: 'A', inicio: '2026-09-14', fimPrevisto: '2026-12-18' })
  ).id;
  projetoB = (
    await container.projetos.criar({ nome: 'B', inicio: '2026-11-02', fimPrevisto: '2027-02-26' })
  ).id;
});

const pessoa = (nome: string, jornadaSemanalHoras = 40) =>
  recursos.pessoas.criar({ nome, funcao: 'Dev', jornadaSemanalHoras });

describe('pessoas', () => {
  it('cria, edita e lista em ordem alfabética', async () => {
    await pessoa('Bruno');
    const ana = await pessoa('Ana');
    await recursos.pessoas.editar(ana.id, { jornadaSemanalHoras: 30 });
    const lista = await recursos.pessoas.listar();
    expect(lista.map((p) => [p.nome, p.jornadaSemanalHoras])).toEqual([
      ['Ana', 30],
      ['Bruno', 40],
    ]);
  });

  it('jornada zero é 422 e não grava; editar inexistente é 404', async () => {
    await expect(pessoa('Ana', 0)).rejects.toBeInstanceOf(ErroDeValidacao);
    expect(await recursos.pessoas.listar()).toEqual([]);
    await expect(recursos.pessoas.editar('nada', { nome: 'x' })).rejects.toBeInstanceOf(
      ErroNaoEncontrado,
    );
  });

  it('remover leva alocações e ausências e tira a pessoa de itens e ações de retrospectiva', async () => {
    const ana = await pessoa('Ana');
    const bruno = await pessoa('Bruno');
    await recursos.alocacoes.criar({
      pessoaId: ana.id,
      projetoId: projetoA,
      inicio: '2026-09-14',
      fim: '2026-12-18',
      percentual: 100,
    });
    await recursos.alocacoes.criar({
      pessoaId: bruno.id,
      projetoId: projetoA,
      inicio: '2026-09-14',
      fim: '2026-12-18',
      percentual: 100,
    });
    await recursos.ausencias.criar({ pessoaId: ana.id, inicio: '2026-10-06', fim: '2026-10-07' });
    const item = await container.backlog.criar(projetoA, { titulo: 'X', responsavelId: ana.id });

    const sprint = await container.sprints.criar(projetoA);
    const pronto = await container.backlog.criar(projetoA, { titulo: 'Y', estimativa: 3 });
    await container.backlog.transicionar(pronto.id, 'pronto_para_sprint');
    await container.sprints.planejar(sprint.id, { meta: 'M', itemIds: [pronto.id] });
    await container.sprints.iniciar(sprint.id);
    await container.sprints.salvarRetrospectiva(sprint.id, {
      bem: [],
      melhorar: [],
      acoes: [
        { descricao: 'Da Ana', responsavelId: ana.id },
        { descricao: 'Do Bruno', responsavelId: bruno.id },
      ],
    });

    await recursos.pessoas.remover(ana.id);

    expect((await recursos.pessoas.listar()).map((p) => p.nome)).toEqual(['Bruno']);
    expect((await recursos.alocacoes.listar()).map((a) => a.pessoaId)).toEqual([bruno.id]);
    expect(await recursos.ausencias.listar()).toEqual([]);
    expect((await container.backlog.obter(item.id)).responsavelId).toBeNull();
    const acoes = (await container.sprints.obter(sprint.id)).retrospectiva?.acoes ?? [];
    expect(acoes[0]).not.toHaveProperty('responsavelId');
    expect(acoes[1]?.responsavelId).toBe(bruno.id);
  });

  it('remover inexistente é 404', async () => {
    await expect(recursos.pessoas.remover('nada')).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });
});

describe('alocações e RN-08', () => {
  it('60% em X e 50% em Y de 02/11 a 13/11 gravam as duas e a segunda avisa pico de 110%', async () => {
    const diego = await pessoa('Diego', 30);
    const primeira = await recursos.alocacoes.criar({
      pessoaId: diego.id,
      projetoId: projetoA,
      inicio: '2026-11-02',
      fim: '2026-11-13',
      percentual: 60,
    });
    expect(primeira.avisos).toEqual([]);

    const segunda = await recursos.alocacoes.criar({
      pessoaId: diego.id,
      projetoId: projetoB,
      inicio: '2026-11-02',
      fim: '2026-11-13',
      percentual: 50,
    });
    expect(segunda.avisos).toEqual([
      expect.objectContaining({ codigo: 'RN-08', pico: 110, de: '2026-11-02', ate: '2026-11-13' }),
    ]);
    expect(await recursos.alocacoes.listar()).toHaveLength(2); // avisa, não bloqueia
  });

  it('o aviso só olha o período da alocação nova', async () => {
    const diego = await pessoa('Diego', 30);
    await recursos.alocacoes.criar({
      pessoaId: diego.id,
      projetoId: projetoA,
      inicio: '2026-11-02',
      fim: '2026-12-18',
      percentual: 60,
    });
    await recursos.alocacoes.criar({
      pessoaId: diego.id,
      projetoId: projetoB,
      inicio: '2026-11-02',
      fim: '2026-12-18',
      percentual: 50,
    });
    const jan = await recursos.alocacoes.criar({
      pessoaId: diego.id,
      projetoId: projetoB,
      inicio: '2027-01-04',
      fim: '2027-01-15',
      percentual: 10,
    });
    expect(jan.avisos).toEqual([]);
  });

  it('pessoa e projeto precisam existir (422); percentual 101 é 422 e não grava', async () => {
    const ana = await pessoa('Ana');
    const base = {
      pessoaId: ana.id,
      projetoId: projetoA,
      inicio: '2026-11-02',
      fim: '2026-11-13',
      percentual: 50,
    };
    await expect(
      recursos.alocacoes.criar({ ...base, pessoaId: 'fantasma' }),
    ).rejects.toBeInstanceOf(ErroDeValidacao);
    await expect(
      recursos.alocacoes.criar({ ...base, projetoId: 'fantasma' }),
    ).rejects.toBeInstanceOf(ErroDeValidacao);
    await expect(recursos.alocacoes.criar({ ...base, percentual: 101 })).rejects.toBeInstanceOf(
      ErroDeValidacao,
    );
    expect(await recursos.alocacoes.listar()).toEqual([]);
  });

  it('lista com filtros por pessoa e por projeto, e remove (404 se não existe)', async () => {
    const ana = await pessoa('Ana');
    const bruno = await pessoa('Bruno');
    const a1 = await recursos.alocacoes.criar({
      pessoaId: ana.id,
      projetoId: projetoA,
      inicio: '2026-09-14',
      fim: '2026-12-18',
      percentual: 100,
    });
    await recursos.alocacoes.criar({
      pessoaId: bruno.id,
      projetoId: projetoB,
      inicio: '2026-11-02',
      fim: '2027-02-26',
      percentual: 100,
    });
    expect(
      (await recursos.alocacoes.listar({ projetoId: projetoA })).map((a) => a.pessoaId),
    ).toEqual([ana.id]);
    expect(
      (await recursos.alocacoes.listar({ pessoaId: bruno.id })).map((a) => a.projetoId),
    ).toEqual([projetoB]);
    await recursos.alocacoes.remover(a1.id);
    await expect(recursos.alocacoes.remover(a1.id)).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });
});

describe('ausências e feriados', () => {
  it('ausência: exige pessoa cadastrada e período coerente', async () => {
    const ana = await pessoa('Ana');
    await expect(
      recursos.ausencias.criar({ pessoaId: 'fantasma', inicio: '2026-10-06', fim: '2026-10-07' }),
    ).rejects.toBeInstanceOf(ErroDeValidacao);
    await expect(
      recursos.ausencias.criar({ pessoaId: ana.id, inicio: '2026-10-07', fim: '2026-10-06' }),
    ).rejects.toBeInstanceOf(ErroDeValidacao);
    const ok = await recursos.ausencias.criar({
      pessoaId: ana.id,
      inicio: '2026-10-06',
      fim: '2026-10-07',
    });
    expect((await recursos.ausencias.listar({ pessoaId: ana.id }))[0]).toEqual(ok);
  });

  it('feriado: data repetida é 422; remove por data; remover inexistente é 404', async () => {
    await recursos.feriados.criar({ data: '2026-12-24', nome: 'Véspera' });
    await expect(
      recursos.feriados.criar({ data: '2026-12-24', nome: 'Outro' }),
    ).rejects.toBeInstanceOf(ErroDeValidacao);
    await recursos.feriados.remover('2026-12-24');
    await expect(recursos.feriados.remover('2026-12-24')).rejects.toBeInstanceOf(ErroNaoEncontrado);
    expect(await recursos.feriados.listar()).toEqual([]);
  });
});

describe('capacidade da sprint (RN-07)', () => {
  it('exemplo da seção 4: Ana 80 h + Bruno 32 h = 112 h', async () => {
    const ana = await pessoa('Ana');
    const bruno = await pessoa('Bruno');
    await recursos.alocacoes.criar({
      pessoaId: ana.id,
      projetoId: projetoA,
      inicio: '2026-09-14',
      fim: '2026-12-18',
      percentual: 100,
    });
    await recursos.alocacoes.criar({
      pessoaId: bruno.id,
      projetoId: projetoA,
      inicio: '2026-09-14',
      fim: '2026-12-18',
      percentual: 50,
    });
    await recursos.ausencias.criar({ pessoaId: bruno.id, inicio: '2026-10-21', fim: '2026-10-22' });
    await recursos.feriados.criar({ data: '2026-11-02', nome: 'Finados' });
    const sprint = await container.sprints.criar(projetoA, { inicio: '2026-10-19' });

    const capacidade = await recursos.capacidadeDaSprint(sprint.id);
    expect(capacidade).toMatchObject({
      sprintId: sprint.id,
      projetoId: projetoA,
      inicio: '2026-10-19',
      fim: '2026-11-02',
      horasTotais: 112,
    });
    expect(capacidade.pessoas.map((p) => [p.nome, p.horas])).toEqual([
      ['Ana', 80],
      ['Bruno', 32],
    ]);
  });

  it('sprint inexistente: 404', async () => {
    await expect(recursos.capacidadeDaSprint('nada')).rejects.toBeInstanceOf(ErroNaoEncontrado);
  });

  it('RN-09: a capacidade não expõe velocity por pessoa', async () => {
    const ana = await pessoa('Ana');
    await recursos.alocacoes.criar({
      pessoaId: ana.id,
      projetoId: projetoA,
      inicio: '2026-09-14',
      fim: '2026-12-18',
      percentual: 100,
    });
    const sprint = await container.sprints.criar(projetoA);
    const texto = JSON.stringify(await recursos.capacidadeDaSprint(sprint.id));
    expect(texto.toLowerCase()).not.toContain('velocity');
  });
});

describe('carga da equipe', () => {
  it('sem datas, mostra 12 semanas a partir da segunda-feira da semana atual (hoje = 09/10)', async () => {
    const carga = await recursos.carga();
    expect(carga.de).toBe('2026-10-05');
    expect(carga.ate).toBe('2026-12-27');
    expect(carga.semanas).toHaveLength(12);
  });

  it('Diego com 110% de 02/11 a 18/12 aparece no mapa e nos avisos', async () => {
    const diego = await pessoa('Diego', 30);
    await recursos.alocacoes.criar({
      pessoaId: diego.id,
      projetoId: projetoA,
      inicio: '2026-09-14',
      fim: '2026-12-18',
      percentual: 60,
    });
    await recursos.alocacoes.criar({
      pessoaId: diego.id,
      projetoId: projetoB,
      inicio: '2026-11-02',
      fim: '2027-02-26',
      percentual: 50,
    });
    const carga = await recursos.carga();
    expect(carga.avisos).toEqual([
      expect.objectContaining({ pico: 110, de: '2026-11-02', ate: '2026-12-18' }),
    ]);
    const semanaDe2Nov = carga.pessoas[0]?.semanas.find((s) => s.inicio === '2026-11-02');
    expect(semanaDe2Nov?.pico).toBe(110);
  });

  it('datas inválidas, fim antes do início e janela maior que 2 anos são 422', async () => {
    await expect(recursos.carga({ de: '2026-13-01' })).rejects.toBeInstanceOf(ErroDeValidacao);
    await expect(recursos.carga({ de: '2026-11-02', ate: '2026-10-01' })).rejects.toBeInstanceOf(
      ErroDeValidacao,
    );
    await expect(recursos.carga({ de: '2026-01-01', ate: '2029-01-01' })).rejects.toBeInstanceOf(
      ErroDeValidacao,
    );
  });
});
