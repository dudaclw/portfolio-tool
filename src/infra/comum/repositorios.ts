import type {
  Repositorio,
  RepositorioFeriados,
  RepositorioHistorico,
  RepositorioItens,
  RepositorioSprints,
} from '@/aplicacao/portas';
import type { HistoricoEstado, ItemBacklog } from '@/dominio/backlog/item-backlog';
import type { Feriado } from '@/dominio/recursos/recursos';
import type { Sprint } from '@/dominio/sprints/sprint';
import type { Banco } from './banco';
import type { ColecaoComId, Dados } from './dados';

/**
 * Repositório genérico sobre uma coleção do Banco. Entrega e guarda cópias, para que quem usa
 * não altere o estado guardado sem chamar `salvar`.
 */
export class RepositorioDeColecao<T extends { id: string }> implements Repositorio<T> {
  constructor(
    private readonly banco: Banco,
    private readonly colecao: ColecaoComId,
  ) {}

  private itens(dados: Dados): T[] {
    return dados[this.colecao] as unknown as T[];
  }

  async listar(): Promise<T[]> {
    return structuredClone(this.itens(await this.banco.ler()));
  }

  async obter(id: string): Promise<T | null> {
    const encontrado = this.itens(await this.banco.ler()).find((item) => item.id === id);
    return encontrado ? structuredClone(encontrado) : null;
  }

  async salvar(entidade: T): Promise<void> {
    const copia = structuredClone(entidade);
    await this.banco.escrever((dados) => {
      const itens = this.itens(dados);
      const posicao = itens.findIndex((item) => item.id === copia.id);
      if (posicao >= 0) itens[posicao] = copia;
      else itens.push(copia);
    });
  }

  async remover(id: string): Promise<void> {
    await this.banco.escrever((dados) => {
      const itens = this.itens(dados);
      const posicao = itens.findIndex((item) => item.id === id);
      if (posicao >= 0) itens.splice(posicao, 1);
    });
  }
}

export class RepositorioDeItens
  extends RepositorioDeColecao<ItemBacklog>
  implements RepositorioItens
{
  constructor(private readonly bancoDeItens: Banco) {
    super(bancoDeItens, 'itens');
  }

  async listarPorProjeto(projetoId: string): Promise<ItemBacklog[]> {
    const dados = await this.bancoDeItens.ler();
    return structuredClone(
      dados.itens.filter((item) => item.projetoId === projetoId).sort((a, b) => a.ordem - b.ordem),
    );
  }
}

/** Histórico de estados: sem id próprio, só se acrescenta; a ordem de gravação é a cronológica. */
export class RepositorioDeHistorico implements RepositorioHistorico {
  constructor(private readonly banco: Banco) {}

  async listarPorItem(itemId: string): Promise<HistoricoEstado[]> {
    const dados = await this.banco.ler();
    return structuredClone(dados.historico.filter((registro) => registro.itemId === itemId));
  }

  async adicionar(registro: HistoricoEstado): Promise<void> {
    const copia = structuredClone(registro);
    await this.banco.escrever((dados) => {
      dados.historico.push(copia);
    });
  }

  async removerDoItem(itemId: string): Promise<void> {
    await this.banco.escrever((dados) => {
      dados.historico = dados.historico.filter((registro) => registro.itemId !== itemId);
    });
  }
}

export class RepositorioDeSprints
  extends RepositorioDeColecao<Sprint>
  implements RepositorioSprints
{
  constructor(private readonly bancoDeSprints: Banco) {
    super(bancoDeSprints, 'sprints');
  }

  async listarPorProjeto(projetoId: string): Promise<Sprint[]> {
    const dados = await this.bancoDeSprints.ler();
    return structuredClone(
      dados.sprints
        .filter((sprint) => sprint.projetoId === projetoId)
        .sort((a, b) => a.numero - b.numero),
    );
  }
}

/** Por enquanto só leitura; o cadastro de feriados chega no M5. */
export class RepositorioDeFeriados implements RepositorioFeriados {
  constructor(private readonly banco: Banco) {}

  async listar(): Promise<Feriado[]> {
    const dados = await this.banco.ler();
    return structuredClone([...dados.feriados].sort((a, b) => a.data.localeCompare(b.data)));
  }
}
