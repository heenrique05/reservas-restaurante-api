import knex from 'knex';
import { configuracao } from './conexao';

// Roda as migrations: npm run db:migrate (cria o que falta)
// e npm run db:rollback (desfaz a última leva).
async function main() {
  const acao = process.argv[2] ?? 'latest';
  const db = knex(configuracao(false));

  try {
    if (acao === 'rollback') {
      const [lote, arquivos] = await db.migrate.rollback();
      console.log(arquivos.length ? `Desfeito o lote ${lote}: ${arquivos.join(', ')}` : 'Nada para desfazer');
    } else {
      const [lote, arquivos] = await db.migrate.latest();
      console.log(arquivos.length ? `Lote ${lote} aplicado: ${arquivos.join(', ')}` : 'O banco já está atualizado');
    }
  } finally {
    await db.destroy();
  }
}

main().catch((erro) => {
  console.error('Erro ao rodar as migrations:', erro.message);
  process.exit(1);
});
