import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Banco } from '../comum/banco';
import { dadosVazios, lerDados, type Dados } from '../comum/dados';

/**
 * Adaptador de arquivo JSON (uso real). Lê o arquivo uma vez e mantém cache em memória; cada
 * gravação é atômica: escreve em `<arquivo>.tmp`, sincroniza e renomeia sobre o arquivo final,
 * então uma queda no meio da escrita nunca deixa o arquivo pela metade.
 */
export class BancoEmArquivo extends Banco {
  constructor(private readonly caminho: string) {
    super();
  }

  protected async carregar(): Promise<Dados> {
    let texto: string;
    try {
      texto = await readFile(this.caminho, 'utf8');
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return dadosVazios();
      throw erro;
    }
    return lerDados(texto, this.caminho);
  }

  protected async persistir(dados: Dados): Promise<void> {
    const temporario = `${this.caminho}.tmp`;
    await mkdir(dirname(this.caminho), { recursive: true });
    try {
      const arquivo = await open(temporario, 'w');
      try {
        await arquivo.writeFile(JSON.stringify(dados, null, 2) + '\n', 'utf8');
        await arquivo.sync();
      } finally {
        await arquivo.close();
      }
      await rename(temporario, this.caminho);
    } catch (erro) {
      await rm(temporario, { force: true });
      throw erro;
    }
  }
}
