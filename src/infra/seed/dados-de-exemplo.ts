import { criarProjeto } from '@/dominio/projetos/projeto';
import type { Pessoa } from '@/dominio/recursos/recursos';
import { dadosVazios, type Dados } from '../comum/dados';

/**
 * Dados de exemplo (agent.md, seção 5). Cresce a cada marco: o M1 traz pessoas e projetos;
 * itens e histórico entram no M2, sprints no M3/M4 e alocações, ausências e feriados no M5.
 */
export function montarDadosDeExemplo(gerarId: () => string): Dados {
  const pessoa = (nome: string, funcao: string, jornadaSemanalHoras: number): Pessoa => ({
    id: gerarId(),
    nome,
    funcao,
    jornadaSemanalHoras,
  });

  const dados = dadosVazios();

  dados.pessoas = [
    pessoa('Ana', 'Desenvolvedora', 40),
    pessoa('Bruno', 'Desenvolvedor', 40),
    pessoa('Carla', 'Product Owner', 40),
    pessoa('Diego', 'Designer', 30),
  ];

  dados.projetos = [
    criarProjeto(gerarId(), {
      nome: 'Portal do Cliente',
      objetivo: 'Permitir que o cliente abra e acompanhe chamados sem depender do atendimento.',
      inicio: '2026-09-14',
      fimPrevisto: '2026-12-18',
      status: 'em_andamento',
      duracaoSprintDias: 15,
    }),
    criarProjeto(gerarId(), {
      nome: 'Migração do RH',
      objetivo: 'Migrar os cadastros e processos de RH para a nova plataforma.',
      inicio: '2026-11-02',
      fimPrevisto: '2027-02-26',
      status: 'planejado',
      duracaoSprintDias: 15,
    }),
  ];

  return dados;
}
