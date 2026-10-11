import type { Data } from './tipos';

/*
 * Utilitários de datas de calendário ('AAAA-MM-DD').
 * Aritmética inteira sobre o calendário gregoriano (algoritmo de Howard Hinnant):
 * sem Date, sem fuso horário e sem relógio, portanto determinística.
 */

const FORMATO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 0 = domingo … 6 = sábado. */
export type DiaDaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

function ehBissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

function diasNoMes(ano: number, mes: number): number {
  const dias = [31, ehBissexto(ano) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return dias[mes - 1] ?? 0;
}

function decompor(data: Data): [number, number, number] | null {
  const partes = FORMATO_DATA.exec(data);
  if (!partes) return null;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > diasNoMes(ano, mes)) return null;
  return [ano, mes, dia];
}

function formatar(ano: number, mes: number, dia: number): Data {
  const doisDigitos = (n: number) => String(n).padStart(2, '0');
  return `${String(ano).padStart(4, '0')}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
}

/** Dias desde 1970-01-01 (negativo antes disso). */
function paraDias(ano: number, mes: number, dia: number): number {
  const a = mes <= 2 ? ano - 1 : ano;
  const era = Math.floor(a / 400);
  const anoDaEra = a - era * 400;
  const mesDesdeMarco = (mes + 9) % 12;
  const diaDoAno = Math.floor((153 * mesDesdeMarco + 2) / 5) + dia - 1;
  const diaDaEra =
    anoDaEra * 365 + Math.floor(anoDaEra / 4) - Math.floor(anoDaEra / 100) + diaDoAno;
  return era * 146097 + diaDaEra - 719468;
}

function deDias(dias: number): Data {
  const z = dias + 719468;
  const era = Math.floor(z / 146097);
  const diaDaEra = z - era * 146097;
  const anoDaEra = Math.floor(
    (diaDaEra -
      Math.floor(diaDaEra / 1460) +
      Math.floor(diaDaEra / 36524) -
      Math.floor(diaDaEra / 146096)) /
      365,
  );
  const diaDoAno =
    diaDaEra - (365 * anoDaEra + Math.floor(anoDaEra / 4) - Math.floor(anoDaEra / 100));
  const mesDesdeMarco = Math.floor((5 * diaDoAno + 2) / 153);
  const dia = diaDoAno - Math.floor((153 * mesDesdeMarco + 2) / 5) + 1;
  const mes = mesDesdeMarco < 10 ? mesDesdeMarco + 3 : mesDesdeMarco - 9;
  const ano = anoDaEra + era * 400 + (mes <= 2 ? 1 : 0);
  return formatar(ano, mes, dia);
}

function diasDe(data: Data): number {
  const partes = decompor(data);
  if (!partes) throw new RangeError(`Data inválida: "${data}". Use o formato AAAA-MM-DD.`);
  return paraDias(...partes);
}

export function ehDataValida(texto: string): texto is Data {
  return decompor(texto) !== null;
}

/** Compara duas datas: negativo se a < b, 0 se iguais, positivo se a > b. */
export function compararDatas(a: Data, b: Data): number {
  return diasDe(a) - diasDe(b);
}

export function somarDias(data: Data, dias: number): Data {
  return deDias(diasDe(data) + dias);
}

/** Quantidade de dias corridos de `de` até `ate` (positivo se `ate` vem depois). */
export function diasEntre(de: Data, ate: Data): number {
  return diasDe(ate) - diasDe(de);
}

export function diaDaSemana(data: Data): DiaDaSemana {
  // 1970-01-01 foi uma quinta-feira (4).
  return ((((diasDe(data) + 4) % 7) + 7) % 7) as DiaDaSemana;
}

export function ehFimDeSemana(data: Data): boolean {
  const dia = diaDaSemana(data);
  return dia === 0 || dia === 6;
}

/** Todas as datas de `inicio` a `fim`, inclusive. Vazio se `fim` vem antes de `inicio`. */
export function intervalo(inicio: Data, fim: Data): Data[] {
  const primeiro = diasDe(inicio);
  const ultimo = diasDe(fim);
  const datas: Data[] = [];
  for (let dia = primeiro; dia <= ultimo; dia++) datas.push(deDias(dia));
  return datas;
}

/**
 * Dias úteis de `inicio` a `fim`, inclusive: exclui sábados, domingos e as datas de `feriados`.
 */
export function diasUteis(inicio: Data, fim: Data, feriados: Iterable<Data> = []): Data[] {
  const datasDeFeriado = new Set(feriados);
  return intervalo(inicio, fim).filter((data) => !ehFimDeSemana(data) && !datasDeFeriado.has(data));
}

/** Domingo de Páscoa (calendário gregoriano, algoritmo anônimo de Meeus/Jones/Butcher). */
export function pascoa(ano: number): Data {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return formatar(ano, mes, dia);
}

/** Sexta-feira Santa: dois dias antes da Páscoa. */
export function sextaFeiraSanta(ano: number): Data {
  return somarDias(pascoa(ano), -2);
}

/** '2026-09-14' → '14/09/2026'. */
export function formatarDataBrasileira(data: Data): string {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Segunda-feira da semana da data (a semana vai de segunda a domingo). */
export function segundaDaSemana(data: Data): Data {
  return somarDias(data, -((diaDaSemana(data) + 6) % 7));
}
