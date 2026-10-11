import { describe, expect, it } from 'vitest';
import { criarItem } from '@/dominio/backlog/item-backlog';
import { criarSprint } from '@/dominio/sprints/sprint';
import type { Pessoa } from '@/dominio/recursos/recursos';
import type { Banco } from './banco';
import {
  RepositorioDeColecao,
  RepositorioDeFeriados,
  RepositorioDeHistorico,
  RepositorioDeItens,
  RepositorioDeSprints,
} from './repositorios';

/**
 * Suíte reutilizável: qualquer adaptador de armazenamento (memória, arquivo, e outros no futuro)
 * precisa passar nestes testes. Se o armazenamento mudar, a mesma suíte prova que nada quebrou.
 */

const pessoa = (id: string, nome = `Pessoa ${id}`): Pessoa => ({
  id,
  nome,
  funcao: 'Desenvolvedora',
  jornadaSemanalHoras: 40,
});

function portao() {
  let abrir!: () => void;
  const aberto = new Promise<void>((resolver) => (abrir = resolver));
  return { aberto, abrir };
}

export function testarContratoDoBanco(nome: string, criarBanco: () => Promise<Banco> | Banco) {
  async function preparar() {
    const banco = await criarBanco();
    return { banco, pessoas: new RepositorioDeColecao<Pessoa>(banco, 'pessoas') };
  }

  describe(`contrato de repositório: ${nome}`, () => {
    it('começa vazio e devolve null para id inexistente', async () => {
      const { pessoas } = await preparar();
      expect(await pessoas.listar()).toEqual([]);
      expect(await pessoas.obter('nao-existe')).toBeNull();
    });

    it('salva, obtém e lista', async () => {
      const { pessoas } = await preparar();
      await pessoas.salvar(pessoa('a'));
      await pessoas.salvar(pessoa('b'));
      expect(await pessoas.obter('a')).toEqual(pessoa('a'));
      expect((await pessoas.listar()).map((p) => p.id)).toEqual(['a', 'b']);
    });

    it('salvar com id existente substitui, sem duplicar', async () => {
      const { pessoas } = await preparar();
      await pessoas.salvar(pessoa('a', 'Antes'));
      await pessoas.salvar(pessoa('a', 'Depois'));
      expect(await pessoas.listar()).toEqual([pessoa('a', 'Depois')]);
    });

    it('remove, e remover inexistente não é erro', async () => {
      const { pessoas } = await preparar();
      await pessoas.salvar(pessoa('a'));
      await pessoas.remover('a');
      await pessoas.remover('a');
      expect(await pessoas.listar()).toEqual([]);
    });

    it('entrega e guarda cópias: alterar o objeto não altera o armazenado', async () => {
      const { pessoas } = await preparar();
      const original = pessoa('a', 'Ana');
      await pessoas.salvar(original);
      original.nome = 'Mudou depois de salvar';
      const lida = await pessoas.obter('a');
      expect(lida?.nome).toBe('Ana');
      if (lida) lida.nome = 'Mudou depois de ler';
      expect((await pessoas.obter('a'))?.nome).toBe('Ana');
    });

    it('transação bem-sucedida mantém o que foi gravado e devolve o resultado', async () => {
      const { banco, pessoas } = await preparar();
      const resultado = await banco.executar(async () => {
        await pessoas.salvar(pessoa('a'));
        await pessoas.salvar(pessoa('b'));
        return 'feito';
      });
      expect(resultado).toBe('feito');
      expect((await pessoas.listar()).map((p) => p.id)).toEqual(['a', 'b']);
    });

    it('erro no meio da transação não grava nada e preserva o que já existia', async () => {
      const { banco, pessoas } = await preparar();
      await pessoas.salvar(pessoa('antiga'));

      await expect(
        banco.executar(async () => {
          await pessoas.salvar(pessoa('nova-1'));
          await pessoas.remover('antiga');
          await pessoas.salvar(pessoa('nova-2'));
          throw new Error('falha no meio');
        }),
      ).rejects.toThrow('falha no meio');

      expect((await pessoas.listar()).map((p) => p.id)).toEqual(['antiga']);
    });

    it('dentro da transação as leituras enxergam as próprias escritas', async () => {
      const { banco, pessoas } = await preparar();
      await banco.executar(async () => {
        await pessoas.salvar(pessoa('a'));
        expect(await pessoas.obter('a')).not.toBeNull();
      });
    });

    it('quem está fora da transação não enxerga o rascunho (sem leitura suja)', async () => {
      const { banco, pessoas } = await preparar();
      const { aberto, abrir } = portao();
      let gravouRascunho!: () => void;
      const rascunhoPronto = new Promise<void>((resolver) => (gravouRascunho = resolver));

      const transacao = banco.executar(async () => {
        await pessoas.salvar(pessoa('rascunho'));
        gravouRascunho();
        await aberto;
      });

      await rascunhoPronto;
      expect(await pessoas.listar()).toEqual([]);
      abrir();
      await transacao;
      expect((await pessoas.listar()).map((p) => p.id)).toEqual(['rascunho']);
    });

    it('transação aninhada participa da externa: erro interno desfaz tudo', async () => {
      const { banco, pessoas } = await preparar();
      await expect(
        banco.executar(async () => {
          await pessoas.salvar(pessoa('externa'));
          await banco.executar(async () => {
            await pessoas.salvar(pessoa('interna'));
            throw new Error('falha interna');
          });
        }),
      ).rejects.toThrow('falha interna');
      expect(await pessoas.listar()).toEqual([]);
    });

    it('escritas simultâneas entram em fila e nenhuma se perde', async () => {
      const { pessoas } = await preparar();
      const ids = Array.from({ length: 20 }, (_, i) => `p${i}`);
      await Promise.all(ids.map((id) => pessoas.salvar(pessoa(id))));
      expect((await pessoas.listar()).map((p) => p.id).sort()).toEqual([...ids].sort());
    });

    it('transações simultâneas de ler-e-gravar não se atropelam', async () => {
      const { banco, pessoas } = await preparar();
      await pessoas.salvar({ ...pessoa('contador'), jornadaSemanalHoras: 0 });

      await Promise.all(
        Array.from({ length: 10 }, () =>
          banco.executar(async () => {
            const atual = await pessoas.obter('contador');
            await Promise.resolve();
            await pessoas.salvar({
              ...pessoa('contador'),
              jornadaSemanalHoras: (atual?.jornadaSemanalHoras ?? 0) + 1,
            });
          }),
        ),
      );

      expect((await pessoas.obter('contador'))?.jornadaSemanalHoras).toBe(10);
    });

    it('itens: listarPorProjeto filtra pelo projeto e entrega na ordem do backlog', async () => {
      const { banco } = await preparar();
      const itens = new RepositorioDeItens(banco);
      await itens.salvar(criarItem('c', 'p1', { titulo: 'C' }, 3));
      await itens.salvar(criarItem('x', 'p2', { titulo: 'X' }, 1));
      await itens.salvar(criarItem('a', 'p1', { titulo: 'A' }, 1));
      await itens.salvar(criarItem('b', 'p1', { titulo: 'B' }, 2));
      expect((await itens.listarPorProjeto('p1')).map((i) => i.id)).toEqual(['a', 'b', 'c']);
      expect((await itens.listarPorProjeto('p2')).map((i) => i.id)).toEqual(['x']);
      expect(await itens.listarPorProjeto('p3')).toEqual([]);
    });

    it('histórico: acrescenta, lista por item em ordem de gravação e remove por item', async () => {
      const { banco } = await preparar();
      const historico = new RepositorioDeHistorico(banco);
      await historico.adicionar({
        itemId: 'i1',
        de: null,
        para: 'novo',
        em: '2026-10-01T09:00:00Z',
      });
      await historico.adicionar({
        itemId: 'i2',
        de: null,
        para: 'novo',
        em: '2026-10-01T10:00:00Z',
      });
      await historico.adicionar({
        itemId: 'i1',
        de: 'novo',
        para: 'refinado',
        em: '2026-10-02T09:00:00Z',
      });
      expect((await historico.listarPorItem('i1')).map((r) => r.para)).toEqual([
        'novo',
        'refinado',
      ]);
      await historico.removerDoItem('i1');
      expect(await historico.listarPorItem('i1')).toEqual([]);
      expect(await historico.listarPorItem('i2')).toHaveLength(1);
    });

    it('histórico: erro no meio da transação não deixa registro', async () => {
      const { banco } = await preparar();
      const historico = new RepositorioDeHistorico(banco);
      await expect(
        banco.executar(async () => {
          await historico.adicionar({
            itemId: 'i1',
            de: null,
            para: 'novo',
            em: '2026-10-01T09:00:00Z',
          });
          throw new Error('falha');
        }),
      ).rejects.toThrow('falha');
      expect(await historico.listarPorItem('i1')).toEqual([]);
    });

    it('sprints: listarPorProjeto filtra pelo projeto e entrega por número', async () => {
      const { banco } = await preparar();
      const sprints = new RepositorioDeSprints(banco);
      await sprints.salvar(criarSprint('c', 'p1', 3, '2026-10-14', 15));
      await sprints.salvar(criarSprint('x', 'p2', 1, '2026-11-02', 15));
      await sprints.salvar(criarSprint('a', 'p1', 1, '2026-09-14', 15));
      await sprints.salvar(criarSprint('b', 'p1', 2, '2026-09-29', 15));
      expect((await sprints.listarPorProjeto('p1')).map((s) => s.id)).toEqual(['a', 'b', 'c']);
      expect((await sprints.listarPorProjeto('p2')).map((s) => s.id)).toEqual(['x']);
    });

    it('feriados: a data é a chave (salvar substitui), lista em ordem de data e remove', async () => {
      const { banco } = await preparar();
      const feriados = new RepositorioDeFeriados(banco);
      expect(await feriados.listar()).toEqual([]);
      expect(await feriados.obter('2026-12-25')).toBeNull();

      await feriados.salvar({ data: '2026-12-25', nome: 'Natal' });
      await feriados.salvar({ data: '2026-10-12', nome: 'N. Sra.' });
      await feriados.salvar({ data: '2026-12-25', nome: 'Natal (corrigido)' });
      expect((await feriados.listar()).map((f) => [f.data, f.nome])).toEqual([
        ['2026-10-12', 'N. Sra.'],
        ['2026-12-25', 'Natal (corrigido)'],
      ]);

      await feriados.remover('2026-10-12');
      await feriados.remover('2026-10-12');
      expect((await feriados.listar()).map((f) => f.data)).toEqual(['2026-12-25']);
    });
  });
}
