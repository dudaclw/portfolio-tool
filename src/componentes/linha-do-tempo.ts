import type { ProjetoNoPortfolio } from '@/aplicacao/metricas/casos-de-uso';
import { compararDatas, diasEntre } from '@/dominio/compartilhado/datas';
import type { Data } from '@/dominio/compartilhado/tipos';
import type { SituacaoSprint } from '@/dominio/sprints/sprint';

export interface TrechoDaLinhaDoTempo {
  /** Posição e largura em % da largura total da linha do tempo. */
  esquerda: number;
  largura: number;
}

export interface LinhaDeProjeto extends TrechoDaLinhaDoTempo {
  id: string;
  nome: string;
  inicio: Data;
  fimPrevisto: Data;
  sprints: (TrechoDaLinhaDoTempo & {
    numero: number;
    situacao: SituacaoSprint;
    inicio: Data;
    fim: Data;
  })[];
}

export interface LinhaDoTempo {
  inicio: Data;
  fim: Data;
  linhas: LinhaDeProjeto[];
  /** Posição do dia de hoje (em %); null se hoje está fora do período mostrado. */
  hoje: number | null;
  /** Marcas de início de mês ao longo do período. */
  meses: { rotulo: string; esquerda: number }[];
}

const NOMES_DOS_MESES = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

const maisCedo = (datas: Data[]) => datas.reduce((a, b) => (compararDatas(a, b) <= 0 ? a : b));
const maisTarde = (datas: Data[]) => datas.reduce((a, b) => (compararDatas(a, b) >= 0 ? a : b));

/**
 * Posições da linha do tempo: uma barra por projeto, do início ao fim previsto, com as sprints
 * dentro dela e uma marca em "hoje". Tudo em % da largura, contando os dias inclusive nas pontas.
 * O período vai do primeiro início ao último fim (considerando também as sprints).
 */
export function montarLinhaDoTempo(
  projetos: ProjetoNoPortfolio[],
  hoje: Data,
): LinhaDoTempo | null {
  if (projetos.length === 0) return null;

  const datas = projetos.flatMap((p) => [
    p.inicio,
    p.fimPrevisto,
    ...p.sprints.flatMap((s) => [s.inicio, s.fim]),
  ]);
  const inicio = maisCedo(datas);
  const fim = maisTarde(datas);
  const totalDeDias = diasEntre(inicio, fim) + 1;

  const esquerdaDe = (data: Data) => (diasEntre(inicio, data) / totalDeDias) * 100;
  const trecho = (de: Data, ate: Data): TrechoDaLinhaDoTempo => ({
    esquerda: esquerdaDe(de),
    largura: ((diasEntre(de, ate) + 1) / totalDeDias) * 100,
  });

  const meses: LinhaDoTempo['meses'] = [];
  const [anoInicial, mesInicial] = inicio.split('-').map(Number) as [number, number];
  const [anoFinal, mesFinal] = fim.split('-').map(Number) as [number, number];
  for (
    let ano = anoInicial, mes = mesInicial;
    ano < anoFinal || (ano === anoFinal && mes <= mesFinal);
  ) {
    const primeiro = `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-01`;
    if (compararDatas(primeiro, inicio) >= 0) {
      meses.push({
        rotulo: `${NOMES_DOS_MESES[mes - 1]}/${String(ano).slice(2)}`,
        esquerda: esquerdaDe(primeiro),
      });
    }
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }

  return {
    inicio,
    fim,
    meses,
    hoje:
      compararDatas(hoje, inicio) >= 0 && compararDatas(hoje, fim) <= 0
        ? esquerdaDe(hoje) + (1 / totalDeDias) * 50
        : null,
    linhas: projetos.map((projeto) => ({
      id: projeto.id,
      nome: projeto.nome,
      inicio: projeto.inicio,
      fimPrevisto: projeto.fimPrevisto,
      ...trecho(projeto.inicio, projeto.fimPrevisto),
      sprints: projeto.sprints.map((sprint) => ({
        numero: sprint.numero,
        situacao: sprint.situacao,
        inicio: sprint.inicio,
        fim: sprint.fim,
        ...trecho(sprint.inicio, sprint.fim),
      })),
    })),
  };
}
