import type { Knex } from 'knex';

// Fila de quem queria um horário que já estava lotado.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('lista_espera', (t) => {
    t.increments('id');
    t.string('nome_cliente', 100).notNullable();
    t.string('telefone', 11).notNullable();
    t.string('email', 255);
    t.integer('pessoas').notNullable();
    t.timestamp('inicio', { useTz: true }).notNullable(); // o horário que a pessoa queria
    t.string('observacao', 500);
    t.enu('status', ['aguardando', 'atendida', 'cancelada']).notNullable().defaultTo('aguardando');
    // Preenchida quando a pessoa ganha uma mesa. SET NULL: se a reserva sumir, a entrada fica.
    t.integer('reserva_id').references('id').inTable('reservas').onDelete('SET NULL');
    t.timestamp('criado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['status', 'inicio'], 'lista_espera_status_inicio');
    t.check('?? > 0', ['pessoas'], 'lista_espera_pessoas_positivo');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('lista_espera');
}
