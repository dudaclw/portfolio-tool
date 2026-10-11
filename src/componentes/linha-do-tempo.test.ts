import { describe, expect, it } from 'vitest';
import type { ProjetoNoPortfolio } from '@/aplicacao/metricas/casos-de-uso';
import { montarLinhaDoTempo } from './linha-do-tempo';

const projeto = (parcial: Partial<ProjetoNoPortfolio>): ProjetoNoPortfolio => ({
  id: 'p',
  nome: 'Projeto',
  status: 'em_andamento',
  inicio: '2026-01-01',
  fimPrevisto: '2026-01-10',
  progresso: { pontosConcluidos: 0, pontosTotais: 0, percentual: null, semEstimativa: 0 },
  sprintAtual: null,
  sprints: [],
  alertas: { itensImpedidos: 0, sobrecarga: [] },
  ...parcial,
});

describe('montarLinhaDoTempo', () => {
  it('sem projetos não há linha do tempo', () => {
    expect(montarLinhaDoTempo([], '2026-10-09')).toBeNull();
  });

  it('o período vai do primeiro início ao último fim, e cada barra ocupa seus dias', () => {
    // 20 dias no total: 01/01 a 20/01
    const linha = montarLinhaDoTempo(
      [
        projeto({ id: 'a', inicio: '2026-01-01', fimPrevisto: '2026-01-10' }),
        projeto({ id: 'b', inicio: '2026-01-11', fimPrevisto: '2026-01-20' }),
      ],
      '2026-01-05',
    );
    expect([linha?.inicio, linha?.fim]).toEqual(['2026-01-01', '2026-01-20']);
    expect(linha?.linhas[0]).toMatchObject({ esquerda: 0, largura: 50 });
    expect(linha?.linhas[1]).toMatchObject({ esquerda: 50, largura: 50 });
  });

  it('as sprints ficam dentro da barra do projeto, na posição certa', () => {
    const linha = montarLinhaDoTempo(
      [
        projeto({
          inicio: '2026-01-01',
          fimPrevisto: '2026-01-20',
          sprints: [
            { id: 's', numero: 1, inicio: '2026-01-06', fim: '2026-01-15', situacao: 'ativa' },
          ],
        }),
      ],
      '2026-01-05',
    );
    const sprint = linha!.linhas[0]!.sprints[0]!;
    expect(sprint).toMatchObject({ numero: 1, esquerda: 25, largura: 50, situacao: 'ativa' });
  });

  it('o período também considera sprints que passam do fim previsto', () => {
    const linha = montarLinhaDoTempo(
      [
        projeto({
          inicio: '2026-01-01',
          fimPrevisto: '2026-01-10',
          sprints: [
            { id: 's', numero: 1, inicio: '2026-01-06', fim: '2026-01-20', situacao: 'ativa' },
          ],
        }),
      ],
      '2026-01-05',
    );
    expect(linha?.fim).toBe('2026-01-20');
  });

  it('a marca de hoje fica no meio do dia; fora do período, não aparece', () => {
    const projetos = [projeto({ inicio: '2026-01-01', fimPrevisto: '2026-01-20' })];
    // dia 11 é o 11º dia de 20: começa em 50% e a marca fica no meio dele (50% + 2,5%)
    expect(montarLinhaDoTempo(projetos, '2026-01-11')?.hoje).toBeCloseTo(52.5, 5);
    expect(montarLinhaDoTempo(projetos, '2025-12-31')?.hoje).toBeNull();
    expect(montarLinhaDoTempo(projetos, '2026-01-21')?.hoje).toBeNull();
  });

  it('marca o início de cada mês dentro do período', () => {
    const linha = montarLinhaDoTempo(
      [projeto({ inicio: '2026-09-14', fimPrevisto: '2026-12-18' })],
      '2026-10-09',
    );
    expect(linha?.meses.map((m) => m.rotulo)).toEqual(['out/26', 'nov/26', 'dez/26']);
  });

  it('atravessa a virada de ano', () => {
    const linha = montarLinhaDoTempo(
      [projeto({ inicio: '2026-11-02', fimPrevisto: '2027-02-26' })],
      '2026-11-10',
    );
    expect(linha?.meses.map((m) => m.rotulo)).toEqual(['dez/26', 'jan/27', 'fev/27']);
  });
});
