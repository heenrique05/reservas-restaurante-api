import type { Knex } from 'knex';
import { STATUS_QUE_OCUPAM } from '../config/regras';
import { Database } from '../database/conexao';
import type { NovaReserva, Reserva, ReservaComMesa, StatusReserva } from '../tipos/dominio';
import type { ReservaRepository } from './ReservaRepository';

type LinhaReserva = {
  id: number;
  mesa_id: number;
  nome_cliente: string;
  telefone: string;
  email: string | null;
  pessoas: number;
  inicio: Date;
  termino: Date;
  status: StatusReserva;
  observacao: string | null;
  criado_em: Date;
};

function paraReserva(l: LinhaReserva): Reserva {
  return {
    id: l.id,
    mesaId: l.mesa_id,
    nomeCliente: l.nome_cliente,
    telefone: l.telefone,
    email: l.email ?? undefined,
    pessoas: l.pessoas,
    dataHora: l.inicio,
    termino: l.termino,
    status: l.status,
    observacao: l.observacao ?? undefined,
    criadoEm: l.criado_em,
  };
}

// "A mesa m não tem reserva ativa que se cruze com esse horário."
// Dois horários se cruzam quando um começa antes do outro terminar.
function semConflito(inicio: Date, termino: Date) {
  return function (this: Knex.QueryBuilder) {
    this.select(1)
      .from('reservas as r')
      .whereRaw('r.mesa_id = m.id')
      .whereIn('r.status', STATUS_QUE_OCUPAM)
      .andWhere('r.inicio', '<', termino)
      .andWhere('r.termino', '>', inicio);
  };
}

// Escolhe a menor mesa livre e cria a reserva, DENTRO de uma transaction que já existe.
// Fica separado para a lista de espera usar a mesma regra, sem copiar código (DRY).
export async function reservarNaTransacao(
  trx: Knex.Transaction,
  dados: NovaReserva & { termino: Date },
): Promise<Reserva | undefined> {
  // 1. Trava as mesas que servem para o grupo (FOR UPDATE).
  //    Se duas pessoas reservarem no mesmo segundo, a segunda espera a primeira terminar,
  //    e aí já enxerga a reserva dela. Sem isso, as duas poderiam pegar a mesma mesa.
  const candidatas = await trx('mesas')
    .select('id')
    .where('ativa', true)
    .andWhere('lugares', '>=', dados.pessoas)
    .orderBy([{ column: 'lugares' }, { column: 'numero' }])
    .forUpdate();
  if (candidatas.length === 0) return undefined;

  // 2. Entre elas, a menor mesa sem reserva que se cruze com o horário pedido.
  const livre = await trx('mesas as m')
    .select('m.id')
    .whereIn(
      'm.id',
      candidatas.map((c) => c.id),
    )
    .whereNotExists(semConflito(dados.dataHora, dados.termino))
    .orderBy([{ column: 'm.lugares' }, { column: 'm.numero' }])
    .first();
  if (!livre) return undefined;

  // 3. Cria a reserva nessa mesa.
  const [linha] = await trx<LinhaReserva>('reservas')
    .insert({
      mesa_id: livre.id,
      nome_cliente: dados.nomeCliente,
      telefone: dados.telefone,
      email: dados.email ?? null,
      pessoas: dados.pessoas,
      inicio: dados.dataHora,
      termino: dados.termino,
      observacao: dados.observacao ?? null,
    })
    .returning('*');
  return paraReserva(linha);
}

export class KnexReservaRepository implements ReservaRepository {
  private get db() {
    return Database.conexao();
  }

  // Transaction (seção 32): ou tudo acontece, ou nada.
  async criarEmMesaLivre(dados: NovaReserva & { termino: Date }) {
    return this.db.transaction((trx) => reservarNaTransacao(trx, dados));
  }

  async haMesaLivre(pessoas: number, inicio: Date, termino: Date) {
    const livre = await this.db('mesas as m')
      .select('m.id')
      .where('m.ativa', true)
      .andWhere('m.lugares', '>=', pessoas)
      .whereNotExists(semConflito(inicio, termino))
      .first();
    return Boolean(livre);
  }

  // JOIN (seção 31): junta cada reserva com a mesa dela para trazer o número.
  async listarPorPeriodo(inicio: Date, fim: Date): Promise<ReservaComMesa[]> {
    const linhas = await this.db('reservas as r')
      .join('mesas as m', 'm.id', 'r.mesa_id')
      .select('r.*', 'm.numero as mesa_numero')
      .where('r.inicio', '>=', inicio)
      .andWhere('r.inicio', '<', fim)
      .orderBy('r.inicio')
      .orderBy('m.numero');
    return linhas.map((l: LinhaReserva & { mesa_numero: number }) => ({ ...paraReserva(l), mesaNumero: l.mesa_numero }));
  }

  async buscarPorId(id: number) {
    const linha = await this.db<LinhaReserva>('reservas').where({ id }).first();
    return linha ? paraReserva(linha) : undefined;
  }

  async atualizarStatus(id: number, de: StatusReserva, para: StatusReserva) {
    const [linha] = await this.db<LinhaReserva>('reservas')
      .where({ id, status: de })
      .update({ status: para })
      .returning('*');
    return linha ? paraReserva(linha) : undefined;
  }
}
