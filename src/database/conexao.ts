import { readdir } from 'node:fs/promises';
import path from 'node:path';
import knex, { type Knex } from 'knex';
import { obrigatoria } from '../config/env';

// Configuração do Knex (seção 32).
// A API usa a conexão com pooler, que aguenta mais acessos ao mesmo tempo.
// As migrations usam a conexão direta.
export function configuracao(usarPooler = true): Knex.Config {
  const url = usarPooler
    ? (process.env.DATABASE_URL_POOLED ?? obrigatoria('DATABASE_URL'))
    : obrigatoria('DATABASE_URL');

  return {
    client: 'pg',
    connection: url,
    pool: { min: 0, max: 10 },
    migrations: { migrationSource: new MigrationsSemExtensao() },
  };
}

// Rodando com tsx as migrations são .ts; depois do build viram .js.
// O Knex guarda o nome com a extensão no histórico, e aí uma migration feita
// no seu PC (.ts) pareceria "sumida" no servidor (.js). Guardando sem a
// extensão, o histórico é o mesmo nos dois lugares.
class MigrationsSemExtensao implements Knex.MigrationSource<string> {
  private pasta = path.join(__dirname, 'migrations');
  private extensao = path.extname(__filename);

  async getMigrations() {
    const arquivos = await readdir(this.pasta);
    return arquivos
      .filter((arquivo) => arquivo.endsWith(this.extensao) && !arquivo.endsWith('.d.ts'))
      .map((arquivo) => arquivo.slice(0, -this.extensao.length))
      .sort();
  }

  getMigrationName(nome: string) {
    return nome;
  }

  async getMigration(nome: string): Promise<Knex.Migration> {
    return require(path.join(this.pasta, nome + this.extensao));
  }
}

// Singleton (seção 28): uma conexão só para a API inteira.
// Cada new knex() abriria um pool novo de conexões com o banco.
export class Database {
  private static instancia: Knex | undefined;

  private constructor() {}

  static conexao(): Knex {
    return (Database.instancia ??= knex(configuracao()));
  }

  static async fechar(): Promise<void> {
    await Database.instancia?.destroy();
    Database.instancia = undefined;
  }
}
