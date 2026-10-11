import { ehDataValida } from '../compartilhado/datas';
import { ErroDeRegra } from '../compartilhado/erro-de-regra';
import { ErroDeValidacao, type ProblemaDeCampo } from '../compartilhado/erro-de-validacao';
import type { Data } from '../compartilhado/tipos';
import type { AcaoRetro, Sprint } from './sprint';

export interface EntradaDeAcaoRetro {
  /** Presente nas ações que já existiam; ausente nas novas. */
  id?: string;
  descricao: string;
  responsavelId?: string | null;
  prazo?: Data | null;
  concluida?: boolean;
}

export interface EntradaDeRetrospectiva {
  bem: string[];
  melhorar: string[];
  acoes: EntradaDeAcaoRetro[];
}

const semVazios = (textos: readonly string[]) =>
  textos.map((texto) => texto.trim()).filter((texto) => texto.length > 0);

/**
 * Salva a retrospectiva inteira (substitui a anterior). Vale com a sprint ativa ou encerrada:
 * depois de encerrada, serve para dar baixa nas ações. Linhas em branco são descartadas.
 */
export function registrarRetrospectiva(
  sprint: Sprint,
  entrada: EntradaDeRetrospectiva,
  gerarId: () => string,
): Sprint {
  if (sprint.situacao === 'planejada') {
    throw new ErroDeRegra(
      'SPRINT-NAO-INICIADA',
      'A retrospectiva só é registrada depois que a sprint inicia.',
    );
  }

  const problemas: ProblemaDeCampo[] = [];
  const acoes: AcaoRetro[] = [];
  entrada.acoes.forEach((acao, indice) => {
    const descricao = acao.descricao.trim();
    if (descricao.length === 0) {
      problemas.push({ campo: `acoes.${indice}.descricao`, mensagem: 'Descreva a ação.' });
    }
    if (acao.prazo && !ehDataValida(acao.prazo)) {
      problemas.push({
        campo: `acoes.${indice}.prazo`,
        mensagem: 'Prazo inválido. Use AAAA-MM-DD.',
      });
    }
    acoes.push({
      id: acao.id ?? gerarId(),
      descricao,
      ...(acao.responsavelId ? { responsavelId: acao.responsavelId } : {}),
      ...(acao.prazo ? { prazo: acao.prazo } : {}),
      concluida: acao.concluida ?? false,
    });
  });
  if (problemas.length > 0) throw new ErroDeValidacao(problemas);

  return {
    ...sprint,
    retrospectiva: { bem: semVazios(entrada.bem), melhorar: semVazios(entrada.melhorar), acoes },
  };
}

/**
 * Ações ainda não concluídas da última retrospectiva registrada (a da sprint de maior número,
 * anterior a `antesDaSprint` quando informado). `null` se nenhuma sprint tem retrospectiva.
 */
export function acoesEmAbertoDaUltimaRetrospectiva(
  sprints: readonly Sprint[],
  antesDaSprint?: number,
): { sprintNumero: number; acoes: AcaoRetro[] } | null {
  const ultima = [...sprints]
    .filter(
      (sprint) =>
        sprint.retrospectiva !== undefined &&
        (antesDaSprint === undefined || sprint.numero < antesDaSprint),
    )
    .sort((a, b) => b.numero - a.numero)[0];
  if (!ultima?.retrospectiva) return null;
  return {
    sprintNumero: ultima.numero,
    acoes: ultima.retrospectiva.acoes.filter((acao) => !acao.concluida),
  };
}
