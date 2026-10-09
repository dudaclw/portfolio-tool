import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pessoa } from '@/dominio/recursos/recursos';
import { RepositorioDeColecao } from '../comum/repositorios';
import { testarContratoDoBanco } from '../comum/suite-de-contrato';
import { BancoEmArquivo } from './banco-em-arquivo';

vi.mock('node:fs/promises', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('node:fs/promises')>();
  return { ...original, rename: vi.fn(original.rename) };
});

const pessoa = (id: string): Pessoa => ({
  id,
  nome: `Pessoa ${id}`,
  funcao: 'Designer',
  jornadaSemanalHoras: 30,
});

let pasta: string;
let caminho: string;

beforeEach(async () => {
  pasta = await mkdtemp(join(tmpdir(), 'dados-teste-'));
  caminho = join(pasta, 'dados.json');
});

afterEach(async () => {
  vi.clearAllMocks();
  await rm(pasta, { recursive: true, force: true });
});

const abrir = (arquivo = caminho) => {
  const banco = new BancoEmArquivo(arquivo);
  return { banco, pessoas: new RepositorioDeColecao<Pessoa>(banco, 'pessoas') };
};

// Mesma suíte de contrato da memória, agora sobre o arquivo (pasta temporária por teste).
testarContratoDoBanco('arquivo JSON', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dados-contrato-'));
  return new BancoEmArquivo(join(dir, 'dados.json'));
});

describe('adaptador de arquivo JSON', () => {
  it('reiniciar mantém os dados: uma nova instância lê o que foi gravado', async () => {
    await abrir().pessoas.salvar(pessoa('a'));
    const { pessoas } = abrir();
    expect((await pessoas.listar()).map((p) => p.id)).toEqual(['a']);
  });

  it('grava com a forma esperada e sem deixar arquivo temporário', async () => {
    await abrir().pessoas.salvar(pessoa('a'));
    const conteudo = JSON.parse(await readFile(caminho, 'utf8'));
    expect(Object.keys(conteudo)).toEqual([
      'versaoEsquema',
      'projetos',
      'itens',
      'historico',
      'sprints',
      'pessoas',
      'alocacoes',
      'ausencias',
      'feriados',
    ]);
    expect(conteudo.versaoEsquema).toBe(1);
    expect(await readdir(pasta)).toEqual(['dados.json']);
  });

  it('arquivo inexistente começa vazio e a pasta é criada na primeira gravação', async () => {
    const fundo = join(pasta, 'a', 'b', 'dados.json');
    const { pessoas } = abrir(fundo);
    expect(await pessoas.listar()).toEqual([]);
    await pessoas.salvar(pessoa('a'));
    expect(JSON.parse(await readFile(fundo, 'utf8')).pessoas).toHaveLength(1);
  });

  it('erro no meio de uma transação não grava nada no disco', async () => {
    const { banco, pessoas } = abrir();
    await pessoas.salvar(pessoa('antiga'));
    const antes = await readFile(caminho, 'utf8');

    await expect(
      banco.executar(async () => {
        await pessoas.salvar(pessoa('nova'));
        throw new Error('falha no meio');
      }),
    ).rejects.toThrow('falha no meio');

    expect(await readFile(caminho, 'utf8')).toBe(antes);
    expect((await abrir().pessoas.listar()).map((p) => p.id)).toEqual(['antiga']);
  });

  it('falha ao renomear na gravação atômica preserva o arquivo e o estado em memória', async () => {
    const { rename } = await import('node:fs/promises');
    const { pessoas } = abrir();
    await pessoas.salvar(pessoa('a'));
    const antes = await readFile(caminho, 'utf8');

    vi.mocked(rename).mockRejectedValueOnce(new Error('disco cheio'));
    await expect(pessoas.salvar(pessoa('b'))).rejects.toThrow('disco cheio');

    expect(await readFile(caminho, 'utf8')).toBe(antes);
    expect(await readdir(pasta)).toEqual(['dados.json']);
    expect((await pessoas.listar()).map((p) => p.id)).toEqual(['a']);

    await pessoas.salvar(pessoa('c'));
    expect((await abrir().pessoas.listar()).map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('ignora um arquivo temporário órfão deixado por uma queda no meio da escrita', async () => {
    await abrir().pessoas.salvar(pessoa('a'));
    await writeFile(`${caminho}.tmp`, '{ "versaoEsq', 'utf8');
    expect((await abrir().pessoas.listar()).map((p) => p.id)).toEqual(['a']);
    await abrir().pessoas.salvar(pessoa('b'));
    expect(await readdir(pasta)).toEqual(['dados.json']);
  });

  it('JSON corrompido gera erro claro e não é sobrescrito', async () => {
    await writeFile(caminho, '{ quebrado', 'utf8');
    await expect(abrir().pessoas.listar()).rejects.toThrow(/não é um JSON válido/);
    expect(await readFile(caminho, 'utf8')).toBe('{ quebrado');
  });

  it('versaoEsquema desconhecida gera erro claro', async () => {
    await writeFile(caminho, JSON.stringify({ versaoEsquema: 99 }), 'utf8');
    await expect(abrir().pessoas.listar()).rejects.toThrow(/versaoEsquema 99/);
  });

  it('substituirTudo troca o conteúdo e persiste', async () => {
    const { banco, pessoas } = abrir();
    await pessoas.salvar(pessoa('velha'));
    const dados = await banco.ler();
    await banco.substituirTudo({ ...structuredClone(dados), pessoas: [pessoa('nova')] });
    expect((await pessoas.listar()).map((p) => p.id)).toEqual(['nova']);
    expect((await abrir().pessoas.listar()).map((p) => p.id)).toEqual(['nova']);
  });
});
