import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /api/v1/saude', () => {
  it('responde 200 com { status: "ok" }', async () => {
    const resposta = GET();
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ status: 'ok' });
  });
});
