import { describe, expect, it } from 'vitest';
import { capacidadeDaSprint } from '@/dominio/recursos/capacidade';
import { mapaDeCarga, avisosDeSobrecarga } from '@/dominio/recursos/carga';
import { montarDadosDeExemplo } from './dados-de-exemplo';

function geradorDeIds() {
  let n = 0;
  return () => `id-${++n}`;
}

describe('montarDadosDeExemplo', () => {
  const dados = montarDadosDeExemplo(geradorDeIds());

  it('traz as quatro pessoas com suas jornadas', () => {
    expect(dados.pessoas.map((p) => [p.nome, p.jornadaSemanalHoras])).toEqual([
      ['Ana', 40],
      ['Bruno', 40],
      ['Carla', 40],
      ['Diego', 30],
    ]);
  });

  it('traz os projetos A e B com as datas do escopo', () => {
    const [a, b] = dados.projetos;
    expect([a?.nome, a?.status, a?.inicio, a?.fimPrevisto, a?.duracaoSprintDias]).toEqual([
      'Portal do Cliente',
      'em_andamento',
      '2026-09-14',
      '2026-12-18',
      15,
    ]);
    expect([b?.nome, b?.status, b?.inicio, b?.fimPrevisto]).toEqual([
      'Migração do RH',
      'planejado',
      '2026-11-02',
      '2027-02-26',
    ]);
  });

  it('o backlog do projeto A tem 8 itens: 7 estimados (3, 5, 8, 2, 5, 13, 3) e 1 sem estimativa', () => {
    const [a] = dados.projetos;
    const itens = dados.itens
      .filter((i) => i.projetoId === a?.id && i.sprintId === null)
      .sort((x, y) => x.ordem - y.ordem);
    expect(itens.map((i) => i.estimativa)).toEqual([3, 5, 8, 2, 5, 13, 3, null]);
    expect(new Set(itens.map((i) => i.estado))).toEqual(
      new Set(['novo', 'refinado', 'pronto_para_sprint']),
    );
  });

  it('o projeto B tem 5 itens, todos novos', () => {
    const [, b] = dados.projetos;
    const itens = dados.itens.filter((i) => i.projetoId === b?.id);
    expect(itens).toHaveLength(5);
    expect(itens.every((i) => i.estado === 'novo')).toBe(true);
  });

  it('as posições de cada projeto vão de 1 a N, sem lacunas', () => {
    for (const projeto of dados.projetos) {
      const ordens = dados.itens
        .filter((i) => i.projetoId === projeto.id)
        .map((i) => i.ordem)
        .sort((x, y) => x - y);
      expect(ordens).toEqual(ordens.map((_, indice) => indice + 1));
    }
  });

  it('o histórico de cada item é coerente: abre em `novo`, encadeia de → para e termina no estado atual', () => {
    for (const item of dados.itens) {
      const registros = dados.historico.filter((h) => h.itemId === item.id);
      expect(registros[0]).toMatchObject({ de: null, para: 'novo' });
      registros.forEach((registro, i) => {
        if (i > 0) expect(registro.de).toBe(registros[i - 1]?.para);
        if (i > 0) expect(registro.em > (registros[i - 1]?.em ?? '')).toBe(true);
      });
      expect(registros.at(-1)?.para).toBe(item.estado);
    }
  });

  describe('sprints do projeto A', () => {
    const [a] = dados.projetos;
    const sprints = dados.sprints.filter((s) => s.projetoId === a?.id);
    const itensDe = (numero: number) => {
      const sprint = sprints.find((s) => s.numero === numero);
      return dados.itens.filter((i) => i.sprintId === sprint?.id);
    };

    it('são três, com as datas e as situações do escopo', () => {
      expect(sprints.map((s) => [s.numero, s.inicio, s.fim, s.situacao])).toEqual([
        [1, '2026-09-14', '2026-09-28', 'encerrada'],
        [2, '2026-09-29', '2026-10-13', 'ativa'],
        [3, '2026-10-14', '2026-10-28', 'planejada'],
      ]);
    });

    it('a sprint 1 tem itens de 5, 3 e 5 pontos, todos aceitos e concluídos, e velocity 13', () => {
      const [um] = sprints;
      expect(um?.itens.map((i) => i.estimativaPlanejada)).toEqual([5, 3, 5]);
      expect(um?.itens.every((i) => i.resultado === 'aceito')).toBe(true);
      expect(um?.velocity).toBe(13);
      expect(itensDe(1).every((i) => i.estado === 'concluido')).toBe(true);
    });

    it('a sprint 2 tem a meta do escopo e 21 pontos: 5 e 3 concluídos, 8 em revisão, 5 em andamento', () => {
      const dois = sprints.find((s) => s.numero === 2);
      expect(dois?.meta).toBe('Cliente abre e acompanha chamados');
      expect(dois?.itens.reduce((soma, i) => soma + i.estimativaPlanejada, 0)).toBe(21);
      const porEstimativa = itensDe(2).map((i) => [i.estimativa, i.estado]);
      expect(porEstimativa).toEqual([
        [5, 'concluido'],
        [3, 'concluido'],
        [8, 'em_revisao'],
        [5, 'em_andamento'],
      ]);
    });

    it('os concluídos de 01/10 e 06/10 têm esses dias no histórico; o de 8 pontos não tem critérios marcados', () => {
      const concluidoEm = (estimativa: number) => {
        const item = itensDe(2).find(
          (i) => i.estimativa === estimativa && i.estado === 'concluido',
        );
        return dados.historico.find((h) => h.itemId === item?.id && h.para === 'concluido')?.em;
      };
      expect(concluidoEm(5)).toBe('2026-10-01T12:00:00Z');
      expect(concluidoEm(3)).toBe('2026-10-06T12:00:00Z');
      expect(itensDe(2).find((i) => i.estimativa === 8)?.dodMarcados).toEqual([]);
    });

    it('a sprint 3 está planejada, sem meta e sem itens', () => {
      const tres = sprints.find((s) => s.numero === 3);
      expect(tres).toMatchObject({ meta: '', itens: [] });
      expect(itensDe(3)).toEqual([]);
    });

    it('todo item concluído tem os critérios da Definição de Pronto marcados (RN-04)', () => {
      const [projetoA] = dados.projetos;
      for (const item of dados.itens.filter((i) => i.estado === 'concluido')) {
        expect(item.dodMarcados).toEqual(projetoA?.definicaoDePronto);
      }
    });

    it('cada item de sprint está na lista de itens da sprint dele', () => {
      for (const sprint of sprints) {
        expect(
          itensDe(sprint.numero)
            .map((i) => i.id)
            .sort(),
        ).toEqual(sprint.itens.map((i) => i.itemId).sort());
      }
    });
  });

  it('traz os feriados de 2026 e 2027 (20), com as Sextas-feiras Santas', () => {
    expect(dados.feriados).toHaveLength(20);
    expect(dados.feriados.map((f) => f.data)).toEqual(
      expect.arrayContaining(['2026-04-03', '2027-03-26', '2026-10-12']),
    );
  });

  it('o percentual de conclusão do projeto A é 21 ÷ 73 pontos estimados (≈ 29%), com 1 item sem estimativa', () => {
    const [a] = dados.projetos;
    const itens = dados.itens.filter((i) => i.projetoId === a?.id);
    const estimados = itens.filter((i) => i.estimativa !== null);
    const total = estimados.reduce((soma, i) => soma + (i.estimativa ?? 0), 0);
    const concluidos = estimados
      .filter((i) => i.estado === 'concluido')
      .reduce((soma, i) => soma + (i.estimativa ?? 0), 0);
    expect([concluidos, total]).toEqual([21, 73]);
    expect(itens.filter((i) => i.estimativa === null)).toHaveLength(1);
  });

  describe('equipe', () => {
    const pessoaDe = (nome: string) => dados.pessoas.find((p) => p.nome === nome)!;
    const [a] = dados.projetos;

    it('Ana e Bruno 100%, Carla 50% e Diego 60% no projeto A; Diego 50% no B', () => {
      const por = (nome: string) =>
        dados.alocacoes
          .filter((x) => x.pessoaId === pessoaDe(nome).id)
          .map((x) => [x.projetoId === a?.id ? 'A' : 'B', x.percentual]);
      expect(por('Ana')).toEqual([['A', 100]]);
      expect(por('Bruno')).toEqual([['A', 100]]);
      expect(por('Carla')).toEqual([['A', 50]]);
      expect(por('Diego')).toEqual([
        ['A', 60],
        ['B', 50],
      ]);
    });

    it('Bruno está ausente de 06/10 a 07/10', () => {
      expect(dados.ausencias.map((x) => [x.pessoaId, x.inicio, x.fim])).toEqual([
        [pessoaDe('Bruno').id, '2026-10-06', '2026-10-07'],
      ]);
    });

    it('capacidade da sprint 3 (roteiro de aceite, passo 7): 88 + 88 + 44 + 39,6 = 259,6 h', () => {
      const sprint3 = dados.sprints.find((s) => s.numero === 3)!;
      const capacidade = capacidadeDaSprint({
        inicio: sprint3.inicio,
        fim: sprint3.fim,
        projetoId: sprint3.projetoId,
        pessoas: dados.pessoas,
        alocacoes: dados.alocacoes,
        ausencias: dados.ausencias,
        feriados: dados.feriados.map((f) => f.data),
      });
      expect(capacidade.pessoas.map((p) => [p.nome, p.horas])).toEqual([
        ['Ana', 88],
        ['Bruno', 88],
        ['Carla', 44],
        ['Diego', 39.6],
      ]);
      expect(capacidade.horasTotais).toBe(259.6);
    });

    it('mapa de carga (passo 9): Diego com 110% de 02/11 a 18/12 e o aviso RN-08', () => {
      const diego = pessoaDe('Diego');
      const dele = dados.alocacoes.filter((x) => x.pessoaId === diego.id);
      expect(avisosDeSobrecarga(diego, dele, '2026-10-05', '2026-12-27')).toEqual([
        expect.objectContaining({ pico: 110, de: '2026-11-02', ate: '2026-12-18' }),
      ]);
      const mapa = mapaDeCarga([diego], dados.alocacoes, '2026-10-05', '2026-12-27');
      const semanasEm110 = mapa.pessoas[0]!.semanas.filter((s) => s.pico === 110).map(
        (s) => s.inicio,
      );
      expect(semanasEm110).toEqual([
        '2026-11-02',
        '2026-11-09',
        '2026-11-16',
        '2026-11-23',
        '2026-11-30',
        '2026-12-07',
        '2026-12-14',
      ]);
    });

    it('ninguém além de Diego passa de 100%', () => {
      for (const pessoa of dados.pessoas.filter((p) => p.nome !== 'Diego')) {
        const dela = dados.alocacoes.filter((x) => x.pessoaId === pessoa.id);
        expect(avisosDeSobrecarga(pessoa, dela, '2026-09-01', '2027-03-31')).toEqual([]);
      }
    });
  });

  it('usa identificadores únicos', () => {
    const ids = [
      ...dados.pessoas,
      ...dados.projetos,
      ...dados.itens,
      ...dados.sprints,
      ...dados.alocacoes,
      ...dados.ausencias,
    ].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
