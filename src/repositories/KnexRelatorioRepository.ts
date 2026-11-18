import { Database } from '../database/conexao';
import type { ContagemDiaStatus, RelatorioRepository } from './RelatorioRepository';

// O banco guarda tudo em UTC; para agrupar por dia e hora, converte para o horário de Brasília.
const FUSO = 'America/Sao_Paulo';

export class KnexRelatorioRepository implements RelatorioRepository {
  private get db() {
    return Database.conexao();
  }

  // GROUP BY (seção 31): uma linha por dia e status, com quantas reservas e quantas pessoas.
  async reservasPorDiaEStatus(inicio: Date, fim: Date): Promise<ContagemDiaStatus[]> {
    const linhas = await this.db('reservas')
      .select(
        this.db.raw(`to_char(inicio AT TIME ZONE ?, 'YYYY-MM-DD') as dia`, [FUSO]),
        'status',
        this.db.raw('count(*)::int as reservas'),
        this.db.raw('sum(pessoas)::int as pessoas'),
      )
      .where('inicio', '>=', inicio)
      .andWhere('inicio', '<', fim)
      .groupBy('dia', 'status')
      .orderBy('dia');
    return linhas as ContagemDiaStatus[];
  }

  // Os horários com mais pedidos de reserva, contando todos os status: mostra a procura.
  async horariosMaisProcurados(inicio: Date, fim: Date, limite: number) {
    const linhas = await this.db('reservas')
      .select(this.db.raw(`to_char(inicio AT TIME ZONE ?, 'HH24:MI') as horario`, [FUSO]), this.db.raw('count(*)::int as reservas'))
      .where('inicio', '>=', inicio)
      .andWhere('inicio', '<', fim)
      .groupBy('horario')
      .orderBy([{ column: 'reservas', order: 'desc' }, { column: 'horario' }])
      .limit(limite);
    return linhas as { horario: string; reservas: number }[];
  }

  async listaEsperaPorStatus(inicio: Date, fim: Date) {
    const linhas = await this.db('lista_espera')
      .select('status', this.db.raw('count(*)::int as total'))
      .where('inicio', '>=', inicio)
      .andWhere('inicio', '<', fim)
      .groupBy('status');
    return linhas as { status: 'aguardando' | 'atendida' | 'cancelada'; total: number }[];
  }
}
