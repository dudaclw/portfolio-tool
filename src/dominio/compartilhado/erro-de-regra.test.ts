import { describe, expect, it } from 'vitest';
import { ErroDeRegra, ehErroDeRegra } from './erro-de-regra';

describe('ErroDeRegra', () => {
  it('carrega código e mensagem em português', () => {
    const erro = new ErroDeRegra('RN-02', 'Já existe uma sprint ativa neste projeto.');
    expect(erro.codigo).toBe('RN-02');
    expect(erro.mensagem).toBe('Já existe uma sprint ativa neste projeto.');
    expect(erro.message).toBe(erro.mensagem);
    expect(erro).toBeInstanceOf(Error);
  });

  it('é reconhecido por ehErroDeRegra', () => {
    expect(ehErroDeRegra(new ErroDeRegra('RN-01', 'x'))).toBe(true);
    expect(ehErroDeRegra(new Error('x'))).toBe(false);
    expect(ehErroDeRegra('RN-01')).toBe(false);
  });
});
