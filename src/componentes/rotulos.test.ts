import { describe, expect, it } from 'vitest';
import { STATUS_DO_PROJETO } from '@/dominio/projetos/projeto';
import { ROTULO_DO_STATUS, formatarData } from './rotulos';

describe('rótulos da interface', () => {
  it('exibe datas como dd/mm/aaaa', () => {
    expect(formatarData('2026-09-14')).toBe('14/09/2026');
    expect(formatarData('2027-02-26')).toBe('26/02/2027');
  });

  it('todo status do projeto tem rótulo em português', () => {
    for (const status of STATUS_DO_PROJETO) expect(ROTULO_DO_STATUS[status]).toBeTruthy();
    expect(ROTULO_DO_STATUS.em_andamento).toBe('Em andamento');
  });
});
