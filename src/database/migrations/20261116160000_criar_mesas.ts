import type { Knex } from 'knex';

// As mesas do salão. O dono cadastra pelo painel.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('mesas', (t) => {
    t.increments('id');
    t.integer('numero').notNullable().unique(); // não existem duas "mesa 5"
    t.integer('lugares').notNullable();
    t.boolean('ativa').notNullable().defaultTo(true);
    t.timestamp('criado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.check('?? > 0', ['lugares'], 'mesas_lugares_positivo');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('mesas');
}
