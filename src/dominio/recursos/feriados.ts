import { ehDataValida, sextaFeiraSanta } from '../compartilhado/datas';
import { ErroDeValidacao, type ProblemaDeCampo } from '../compartilhado/erro-de-validacao';
import type { Feriado } from './recursos';

/** Feriados nacionais fixos (agent.md, seção 4) mais a Sexta-feira Santa, em ordem de data. */
export function feriadosNacionais(ano: number): Feriado[] {
  const aaaa = String(ano).padStart(4, '0');
  const feriados: Feriado[] = [
    { data: `${aaaa}-01-01`, nome: 'Confraternização Universal' },
    { data: sextaFeiraSanta(ano), nome: 'Sexta-feira Santa' },
    { data: `${aaaa}-04-21`, nome: 'Tiradentes' },
    { data: `${aaaa}-05-01`, nome: 'Dia do Trabalho' },
    { data: `${aaaa}-09-07`, nome: 'Independência do Brasil' },
    { data: `${aaaa}-10-12`, nome: 'Nossa Senhora Aparecida' },
    { data: `${aaaa}-11-02`, nome: 'Finados' },
    { data: `${aaaa}-11-15`, nome: 'Proclamação da República' },
    { data: `${aaaa}-11-20`, nome: 'Consciência Negra' },
    { data: `${aaaa}-12-25`, nome: 'Natal' },
  ];
  return feriados.sort((a, b) => a.data.localeCompare(b.data));
}

/** Feriado cadastrado à mão. A data é a chave: um feriado por dia. */
export function criarFeriado(entrada: Feriado): Feriado {
  const nome = entrada.nome.trim();
  const problemas: ProblemaDeCampo[] = [];
  if (!ehDataValida(entrada.data)) {
    problemas.push({ campo: 'data', mensagem: 'Data inválida. Use AAAA-MM-DD.' });
  }
  if (nome.length === 0) problemas.push({ campo: 'nome', mensagem: 'Informe o nome do feriado.' });
  if (problemas.length > 0) throw new ErroDeValidacao(problemas);
  return { data: entrada.data, nome };
}
