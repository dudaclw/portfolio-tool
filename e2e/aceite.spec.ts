import { expect, test, type Page } from '@playwright/test';
import { encerrar, prepararEIniciar, reiniciar } from './servidor';

/*
 * Roteiro de aceite do MVP (agent.md, seção 9), de ponta a ponta no navegador, sobre uma cópia
 * dos dados de exemplo e com RELOGIO_FIXO=2026-10-09T12:00:00Z. Os passos dependem uns dos
 * outros, então rodam em série num único teste.
 */

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  test.setTimeout(300_000);
  await prepararEIniciar();
});

test.afterAll(async () => {
  await encerrar();
});

const coluna = (page: Page, titulo: string) =>
  page.getByRole('region', { name: new RegExp(`^${titulo} \\(`) });

const linhaDoPortal = (page: Page) => page.getByRole('row', { name: /Portal do Cliente/ });

async function abrirProjeto(page: Page, aba?: string) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Portal do Cliente' }).first().click();
  await expect(page.getByRole('heading', { name: 'Portal do Cliente', level: 1 })).toBeVisible();
  if (aba) {
    await page
      .getByRole('navigation', { name: 'Seções do projeto' })
      .getByRole('link', { name: aba })
      .click();
  }
}

test('roteiro de aceite do MVP', async ({ page }) => {
  await test.step('1. Painel: dois projetos; Portal com ≈ 29%, 1 item sem estimativa e sprint 2 com 2 dias úteis', async () => {
    await page.goto('/');
    await expect(page.getByRole('row')).toHaveCount(3); // cabeçalho + 2 projetos
    await expect(page.getByRole('row', { name: /Migração do RH/ })).toBeVisible();
    const portal = linhaDoPortal(page);
    await expect(portal).toContainText('29%');
    await expect(portal).toContainText('1 item sem estimativa');
    await expect(portal).toContainText('Sprint 2');
    await expect(portal).toContainText('2 dias úteis restantes');
  });

  await test.step('2. Quadro da sprint 2: cartões nas colunas e burndown com escopo 21 e restante 13', async () => {
    await linhaDoPortal(page).getByRole('link', { name: 'Sprint 2' }).click();
    await expect(page.getByRole('heading', { name: 'Quadro da sprint 2' })).toBeVisible();

    await expect(coluna(page, 'A fazer').getByRole('listitem')).toHaveCount(0);
    const concluido = coluna(page, 'Concluído');
    await expect(concluido.getByRole('listitem')).toHaveCount(2);
    await expect(concluido).toContainText('Acompanhar o andamento de um chamado');
    await expect(concluido).toContainText('5 pts');
    await expect(concluido).toContainText('Ver o histórico de mensagens do chamado');
    await expect(concluido).toContainText('3 pts');
    await expect(coluna(page, 'Em revisão')).toContainText(
      'Receber as respostas do atendimento no portal',
    );
    await expect(coluna(page, 'Em revisão')).toContainText('8 pts');
    await expect(coluna(page, 'Em andamento')).toContainText('Encerrar um chamado já resolvido');
    await expect(coluna(page, 'Em andamento')).toContainText('5 pts');

    const burndown = page.getByRole('complementary', { name: 'Burndown' });
    await expect(burndown).toContainText('Restante: 13 pts');
    await expect(burndown).toContainText('Escopo: 21 pts');
  });

  await test.step('3. Definição de Pronto: RN-04 ao lado da ação; com os 4 critérios o cartão conclui e o restante vai a 5', async () => {
    const mover = page.getByRole('button', {
      name: 'Mover Receber as respostas do atendimento no portal para Concluído',
    });
    await mover.click();
    const cartao = coluna(page, 'Em revisão').getByRole('listitem').first();
    await expect(cartao.getByRole('alert')).toContainText('RN-04');

    await page
      .getByRole('button', { name: 'Receber as respostas do atendimento no portal', exact: true })
      .click();
    const janela = page.getByRole('dialog');
    for (const criterio of [
      'Critérios de aceite atendidos',
      'Testado',
      'Revisado por outra pessoa',
      'Documentação atualizada quando aplicável',
    ]) {
      await janela.getByLabel(criterio).check();
      await expect(janela.getByLabel(criterio)).toBeChecked();
    }
    await janela.getByRole('button', { name: 'Fechar' }).click();
    await expect(janela).toBeHidden();

    await mover.click();
    await expect(coluna(page, 'Concluído').getByRole('listitem')).toHaveCount(3);
    await expect(page.getByRole('complementary', { name: 'Burndown' })).toContainText(
      'Restante: 5 pts',
    );
  });

  await test.step('4. Impedimento: o cartão mostra o sinal e o Painel mostra o alerta', async () => {
    await page
      .getByRole('button', { name: 'Encerrar um chamado já resolvido', exact: true })
      .click();
    const janela = page.getByRole('dialog');
    await janela.getByLabel('Motivo do impedimento').fill('Aguardando definição do cliente');
    await janela.getByRole('button', { name: 'Marcar como impedido' }).click();
    await expect(janela).toContainText('Impedido');
    await janela.getByRole('button', { name: 'Fechar' }).click();
    await expect(coluna(page, 'Em andamento')).toContainText(
      'Impedido: Aguardando definição do cliente',
    );

    await page.goto('/');
    await expect(linhaDoPortal(page)).toContainText('1 item impedido');
  });

  await test.step('5. Review e retrospectiva: aceitos 5, 3 e 8; não aceito o outro de 5; retro com uma ação', async () => {
    await linhaDoPortal(page).getByRole('link', { name: 'Sprint 2' }).click();
    await page.getByRole('link', { name: 'Review e retrospectiva' }).click();
    await expect(
      page.getByRole('heading', { name: 'Review e retrospectiva da sprint 2' }),
    ).toBeVisible();

    for (const titulo of [
      'Acompanhar o andamento de um chamado',
      'Ver o histórico de mensagens do chamado',
      'Receber as respostas do atendimento no portal',
    ]) {
      await page.getByRole('group', { name: titulo }).getByLabel('Aceito', { exact: true }).check();
    }
    await page
      .getByRole('group', { name: 'Encerrar um chamado já resolvido' })
      .getByLabel('Não aceito', { exact: true })
      .check();
    await page.getByRole('button', { name: 'Salvar review' }).click();
    await expect(page.getByText('Review salvo.')).toBeVisible();

    await page.getByLabel('O que foi bem').fill('Entregas revisadas no prazo');
    await page.getByLabel('O que melhorar').fill('Itens ficando parados em revisão');
    await page.getByRole('button', { name: 'Adicionar ação' }).click();
    await page.getByLabel('Ação 1', { exact: true }).fill('Revisar em duplas no mesmo dia');
    const acao = page
      .getByRole('listitem')
      .filter({ has: page.getByLabel('Ação 1', { exact: true }) });
    await acao.getByRole('combobox').selectOption({ label: 'Ana' });
    await acao.locator('input[type="date"]').fill('2026-10-20');
    await page.getByRole('button', { name: 'Salvar retrospectiva' }).click();
    await expect(page.getByText('Retrospectiva salva.')).toBeVisible();
  });

  await test.step('6. Encerramento: velocity 16; o não aceito volta ao topo; progresso 40%; média 14,5', async () => {
    await page.getByRole('button', { name: 'Encerrar sprint' }).click();
    const confirmacao = page.getByRole('dialog');
    await expect(confirmacao).toContainText('velocity 16');
    await confirmacao.getByRole('button', { name: 'Encerrar sprint' }).click();
    await expect(page.getByText(/Encerrada · velocity 16/)).toBeVisible();

    await abrirProjeto(page, 'Backlog');
    const primeira = page.getByRole('row').nth(1);
    await expect(primeira).toContainText('Encerrar um chamado já resolvido');
    await expect(primeira.getByRole('combobox')).toHaveValue('pronto_para_sprint');

    await page
      .getByRole('navigation', { name: 'Seções do projeto' })
      .getByRole('link', { name: 'Métricas' })
      .click();
    await expect(page.getByText('40%', { exact: true })).toBeVisible();
    await expect(page.getByText('29 ÷ 73', { exact: false })).toBeVisible();
    await expect(page.getByText('14,5 pontos')).toBeVisible();
  });

  await test.step('7. Planejamento da sprint 3: capacidade 259,6 h, ação da retro em aberto, aviso acima da média e início', async () => {
    await page
      .getByRole('navigation', { name: 'Seções do projeto' })
      .getByRole('link', { name: 'Sprints' })
      .click();
    await page.getByRole('link', { name: 'Planejamento da sprint 3' }).click();
    await expect(page.getByRole('heading', { name: 'Planejamento da sprint 3' })).toBeVisible();
    await expect(page.getByText('14/10/2026 a 28/10/2026')).toBeVisible();

    await expect(page.getByText('Capacidade da sprint: 259,6 h')).toBeVisible();
    const capacidade = page.getByRole('table', { name: 'Capacidade em horas por pessoa' });
    for (const [nome, horas] of [
      ['Ana', '88 h'],
      ['Bruno', '88 h'],
      ['Carla', '44 h'],
      ['Diego', '39,6 h'],
    ] as const) {
      const linha = capacidade.getByRole('row', { name: new RegExp(nome) });
      await expect(linha).toContainText('11');
      await expect(linha).toContainText(horas);
    }

    await expect(page.getByText('Ações em aberto da retrospectiva da sprint 2')).toBeVisible();
    await expect(
      page.getByText(/Revisar em duplas no mesmo dia · Ana · prazo 20\/10\/2026/),
    ).toBeVisible();

    for (const titulo of [
      'Encerrar um chamado já resolvido',
      'Listar meus chamados',
      'Filtrar chamados por status',
      'Corrigir a paginação da lista de chamados',
    ]) {
      await page.getByRole('checkbox', { name: new RegExp(titulo) }).check();
    }
    await expect(page.getByText(/^16 pontos escolhidos ·/)).toBeVisible();
    await expect(page.getByText(/passam da velocity média \(14,5\)/)).toBeVisible();

    await page.getByLabel('Meta da sprint').fill('Cliente lista, filtra e encerra chamados');
    await page.getByRole('button', { name: 'Iniciar sprint' }).click();
    await expect(page.getByRole('heading', { name: 'Quadro da sprint 3' })).toBeVisible();
    await expect(page.getByText(/Ativa/).first()).toBeVisible();
  });

  await test.step('8. Uma sprint ativa por projeto: iniciar a sprint 4 com a 3 ativa mostra RN-02', async () => {
    await page.getByRole('link', { name: 'Todas as sprints' }).click();
    await page.getByRole('button', { name: 'Criar sprint' }).click();
    await page.getByRole('link', { name: 'Planejamento da sprint 4' }).click();
    await expect(page.getByRole('heading', { name: 'Planejamento da sprint 4' })).toBeVisible();
    await page.getByRole('button', { name: 'Iniciar sprint' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'RN-02' })).toContainText(
      'A sprint 3 já está ativa',
    );
  });

  await test.step('9. Equipe: Diego com 110% em todas as semanas de 02/11 a 18/12, com destaque e aviso RN-08', async () => {
    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Equipe' })
      .click();
    const mapa = page.getByRole('region', { name: 'Mapa de carga' });
    await expect(mapa).toContainText(
      'Diego está com 110% de alocação (acima de 100%) de 02/11/2026 a 18/12/2026.',
    );
    const diego = mapa.getByRole('row', { name: /Diego/ });
    await expect(diego.getByRole('cell', { name: /110%/ })).toHaveCount(7);
    await expect(diego.getByText('(acima de 100%)')).toHaveCount(7);
    for (const semana of ['02/11', '09/11', '16/11', '23/11', '30/11', '07/12', '14/12']) {
      await expect(mapa.getByRole('columnheader', { name: new RegExp(semana) })).toBeVisible();
    }
  });

  await test.step('10. Métricas: velocity 13 e 16, média 14,5; burndown da sprint 3 começa no escopo planejado (16)', async () => {
    await abrirProjeto(page, 'Métricas');
    const velocity = page.getByRole('region', { name: 'Velocity' });
    await expect(velocity).toContainText('14,5 pontos');
    await velocity.getByText('Ver os números em tabela').click();
    const tabela = velocity.getByRole('table');
    await expect(tabela.getByRole('row', { name: /Sprint 1/ })).toContainText('13');
    await expect(tabela.getByRole('row', { name: /Sprint 2/ })).toContainText('16');

    const burndown = page.getByRole('region', { name: 'Burndown da sprint' });
    await expect(burndown.getByLabel('Sprint exibida')).toHaveValue(/.+/);
    await expect(burndown.getByLabel('Sprint exibida').locator('option:checked')).toContainText(
      'Sprint 3',
    );
    await expect(burndown).toContainText('Escopo: 16 pts');
    await burndown.getByText('Ver os números em tabela').click();
    const primeiroDia = burndown.getByRole('table').getByRole('row').nth(1);
    await expect(primeiroDia).toContainText('14/10/2026');
    await expect(primeiroDia.getByRole('cell').nth(0)).toHaveText('16'); // restante
    await expect(primeiroDia.getByRole('cell').nth(1)).toHaveText('16'); // escopo
    await expect(primeiroDia.getByRole('cell').nth(2)).toHaveText('16'); // ideal
  });

  await test.step('11. Persistência: reiniciar o servidor e tudo continua como estava', async () => {
    await reiniciar();
    await page.goto('/');
    const portal = linhaDoPortal(page);
    await expect(portal).toContainText('40%');
    await expect(portal).toContainText('Sprint 3');
    await expect(portal).toContainText('1 item impedido');

    await abrirProjeto(page, 'Sprints');
    await expect(page.getByRole('row', { name: /Sprint 2/ })).toContainText('16');
    await expect(page.getByRole('row', { name: /Sprint 2/ })).toContainText('Encerrada');
    await expect(page.getByRole('row', { name: /Sprint 3/ })).toContainText('Ativa');
    await expect(page.getByRole('row', { name: /Sprint 4/ })).toContainText('Planejada');
  });
});
