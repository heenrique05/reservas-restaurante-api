import type { Knex } from 'knex';

const ANTIGOS = ['aguardando_sinal', 'confirmada', 'cancelada', 'concluida', 'nao_compareceu'];
const NOVOS = [...ANTIGOS, 'expirada'];

function regraDoStatus(lista: string[]) {
  return `CHECK (status IN (${lista.map((s) => `'${s}'`).join(', ')}))`;
}

// Prazo para pagar o sinal e o novo status "expirada".
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('reservas', (t) => {
    t.timestamp('expira_em', { useTz: true });
  });

  // O enu do Knex virou uma regra CHECK no Postgres. Para aceitar "expirada", a regra é trocada.
  await knex.raw('ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_status_check');
  await knex.raw(`ALTER TABLE reservas ADD CONSTRAINT reservas_status_check ${regraDoStatus(NOVOS)}`);

  // Reservas que já existiam sem prazo ganham 5 minutos a partir de agora.
  await knex('reservas')
    .where('status', 'aguardando_sinal')
    .update({ expira_em: knex.raw("now() + interval '5 minutes'") });

  // A varredura procura "aguardando sinal com prazo vencido" o tempo todo: o índice deixa isso rápido.
  await knex.schema.alterTable('reservas', (t) => {
    t.index(['status', 'expira_em'], 'reservas_status_expira_em');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex('reservas').where('status', 'expirada').update({ status: 'cancelada' });
  await knex.raw('ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_status_check');
  await knex.raw(`ALTER TABLE reservas ADD CONSTRAINT reservas_status_check ${regraDoStatus(ANTIGOS)}`);
  await knex.schema.alterTable('reservas', (t) => {
    t.dropIndex(['status', 'expira_em'], 'reservas_status_expira_em');
    t.dropColumn('expira_em');
  });
}
