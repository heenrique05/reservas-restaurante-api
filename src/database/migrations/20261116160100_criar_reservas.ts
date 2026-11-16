import type { Knex } from 'knex';

// As reservas. Cada uma ocupa uma mesa de "inicio" até "termino".
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('reservas', (t) => {
    t.increments('id');
    // Chave estrangeira (seção 31): a reserva aponta para uma mesa que existe.
    // restrict = o banco não deixa apagar uma mesa que tem reservas.
    t.integer('mesa_id').notNullable().references('id').inTable('mesas').onDelete('RESTRICT');
    t.string('nome_cliente', 100).notNullable();
    t.string('telefone', 11).notNullable();
    t.string('email', 255);
    t.integer('pessoas').notNullable();
    t.timestamp('inicio', { useTz: true }).notNullable();
    t.timestamp('termino', { useTz: true }).notNullable();
    t.enu('status', ['aguardando_sinal', 'confirmada', 'cancelada', 'concluida', 'nao_compareceu'])
      .notNullable()
      .defaultTo('aguardando_sinal');
    t.string('observacao', 500);
    t.timestamp('criado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Deixa rápida a busca "essa mesa já tem reserva nesse horário?".
    t.index(['mesa_id', 'inicio'], 'reservas_mesa_inicio');
    t.check('?? > 0', ['pessoas'], 'reservas_pessoas_positivo');
    t.check('?? > ??', ['termino', 'inicio'], 'reservas_termino_depois_do_inicio');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('reservas');
}
