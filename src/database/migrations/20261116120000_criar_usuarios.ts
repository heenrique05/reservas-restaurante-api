import type { Knex } from 'knex';

// Tabela de quem usa o painel do restaurante (dono e funcionários).
// Cliente que faz reserva não é usuário: ele não tem login.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('usuarios', (t) => {
    t.increments('id');
    t.string('nome', 100).notNullable();
    t.string('email', 255).notNullable().unique(); // a garantia de verdade contra e-mail repetido
    t.string('senha_hash').notNullable();
    t.enu('papel', ['dono', 'funcionario']).notNullable().defaultTo('dono');
    t.timestamp('criado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('atualizado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('usuarios');
}
