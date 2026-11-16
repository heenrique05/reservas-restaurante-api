import knex from 'knex';
import { configuracao } from '../database/conexao';

// Roda UMA vez antes de todos os testes: prepara as tabelas do banco de testes.
// Os arquivos de teste rodam ao mesmo tempo, então as migrations não podem ficar dentro deles.
export default async function globalSetup() {
  const url = process.env.DATABASE_URL_TESTE;
  if (!url) return; // sem banco de testes, os testes de integração são pulados

  process.env.DATABASE_URL = url; // configuracao() só lê o endereço quando é chamada
  const db = knex(configuracao(false));
  try {
    await db.migrate.latest();
  } finally {
    await db.destroy();
  }
}
