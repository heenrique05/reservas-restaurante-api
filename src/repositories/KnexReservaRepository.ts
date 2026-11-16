import type { Knex } from 'knex';
import { FOLGA_MS } from '../config/regras';
import { Database } from '../database/conexao';
import type { Reserva, ReservaComMesa, StatusReserva } from '../tipos/dominio';
import type { DadosParaReservar, Ocupacao, ReservaRepository } from './ReservaRepository';

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
  expira_em: Date | null;
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
    expiraEm: l.expira_em ?? undefined,
    criadoEm: l.criado_em,
  };
}

// Uma reserva segura a mesa quando está confirmada,
// ou aguardando o sinal DENTRO do prazo. Venceu o prazo, a mesa já está livre,
// mesmo antes de a varredura marcar a reserva como "expirada".
function ocupaAMesa(qb: Knex.QueryBuilder) {
  qb.where('r.status', 'confirmada').orWhere((q) =>
    q.where('r.status', 'aguardando_sinal').andWhere((p) => p.whereNull('r.expira_em').orWhereRaw('r.expira_em > now()')),
  );
}

// "A mesa m não tem reserva que se cruze com esse horário", contando a folga para arrumar a mesa.
// Dois horários se cruzam quando um começa antes do outro terminar.
function semConflito(inicio: Date, termino: Date) {
  return function (this: Knex.QueryBuilder) {
    this.select(1)
      .from('reservas as r')
      .whereRaw('r.mesa_id = m.id')
      .where(ocupaAMesa)
      .andWhere('r.inicio', '<', new Date(termino.getTime() + FOLGA_MS))
      .andWhere('r.termino', '>', new Date(inicio.getTime() - FOLGA_MS));
  };
}

// Escolhe a menor mesa livre e cria a reserva, DENTRO de uma transaction que já existe.
// Fica separado para a lista de espera usar a mesma regra, sem copiar código (DRY).
export async function reservarNaTransacao(trx: Knex.Transaction, dados: DadosParaReservar): Promise<Reserva | undefined> {
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
      expira_em: dados.expiraEm,
    })
    .returning('*');
  return paraReserva(linha);
}

export class KnexReservaRepository implements ReservaRepository {
  private get db() {
    return Database.conexao();
  }

  // Transaction (seção 32): ou tudo acontece, ou nada.
  async criarEmMesaLivre(dados: DadosParaReservar) {
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

  async ocupacao(pessoas: number, de: Date, ate: Date): Promise<Ocupacao> {
    const mesas = await this.db('mesas').select('id').where('ativa', true).andWhere('lugares', '>=', pessoas);
    const ids = mesas.map((m) => m.id as number);
    if (ids.length === 0) return { mesas: [], reservas: [] };

    const reservas = await this.db('reservas as r')
      .select('r.mesa_id', 'r.inicio', 'r.termino')
      .whereIn('r.mesa_id', ids)
      .where(ocupaAMesa)
      .andWhere('r.inicio', '<', ate)
      .andWhere('r.termino', '>', de);

    return {
      mesas: ids,
      reservas: reservas.map((r) => ({ mesaId: r.mesa_id, inicio: r.inicio, termino: r.termino })),
    };
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

  // Um UPDATE só: cada reserva vencida é marcada uma única vez, mesmo com duas varreduras juntas.
  async expirarVencidas() {
    const linhas = await this.db<LinhaReserva>('reservas')
      .where('status', 'aguardando_sinal')
      .andWhereRaw('expira_em <= now()')
      .update({ status: 'expirada' })
      .returning('*');
    return linhas.map(paraReserva);
  }
}
