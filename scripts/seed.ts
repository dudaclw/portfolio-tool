import { randomUUID } from 'node:crypto';
import { BancoEmArquivo } from '../src/infra/arquivo-json/banco-em-arquivo';
import { caminhoPadraoDosDados } from '../src/infra/container';
import { montarDadosDeExemplo } from '../src/infra/seed/dados-de-exemplo';

// Recria data/dados.json com o projeto de exemplo. Pare o app antes: ele guarda o arquivo em cache.
async function semear(): Promise<void> {
  const caminho = caminhoPadraoDosDados();
  const dados = montarDadosDeExemplo(randomUUID);
  await new BancoEmArquivo(caminho).substituirTudo(dados);
  console.log(
    `Dados de exemplo gravados em ${caminho}: ${dados.projetos.length} projetos, ${dados.pessoas.length} pessoas, ${dados.itens.length} itens.`,
  );
}

semear().catch((erro: unknown) => {
  console.error('Falha ao gravar os dados de exemplo:', erro);
  process.exit(1);
});
