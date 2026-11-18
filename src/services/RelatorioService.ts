import type { RelatorioRepository } from '../repositories/RelatorioRepository';
import type { Relatorio, ResumoDoDia, StatusEspera, StatusReserva } from '../tipos/dominio';

const TODOS_STATUS: StatusReserva[] = ['aguardando_sinal', 'confirmada', 'cancelada', 'concluida', 'nao_compareceu', 'expirada'];
const STATUS_ESPERA: StatusEspera[] = ['aguardando', 'atendida', 'cancelada'];

// Porcentagem com uma casa decimal. Sem base para calcular, devolve null (e não um 0 enganoso).
function porcentagem(parte: number, total: number): number | null {
  return total === 0 ? null : Math.round((parte / total) * 1000) / 10;
}

// Transforma as linhas agrupadas pelo banco no relatório que o painel mostra.
export class RelatorioService {
  constructor(private readonly repositorio: RelatorioRepository) {}

  async gerar(periodo: { de: string; ate: string; inicio: Date; fim: Date }): Promise<Relatorio> {
    const [linhas, horarios, espera] = await Promise.all([
      this.repositorio.reservasPorDiaEStatus(periodo.inicio, periodo.fim),
      this.repositorio.horariosMaisProcurados(periodo.inicio, periodo.fim, 5),
      this.repositorio.listaEsperaPorStatus(periodo.inicio, periodo.fim),
    ]);

    // Totais por status, começando tudo em zero para nenhum status "sumir" do relatório.
    const reservas = Object.fromEntries(TODOS_STATUS.map((s) => [s, 0])) as Relatorio['reservas'];
    reservas.total = 0;
    let pessoasAtendidas = 0;
    const dias = new Map<string, ResumoDoDia>();

    for (const linha of linhas) {
      reservas[linha.status] += linha.reservas;
      reservas.total += linha.reservas;
      if (linha.status === 'concluida') pessoasAtendidas += linha.pessoas;

      const dia = dias.get(linha.dia) ?? { dia: linha.dia, total: 0, concluidas: 0, canceladas: 0, faltas: 0, expiradas: 0 };
      dia.total += linha.reservas;
      if (linha.status === 'concluida') dia.concluidas += linha.reservas;
      if (linha.status === 'cancelada') dia.canceladas += linha.reservas;
      if (linha.status === 'nao_compareceu') dia.faltas += linha.reservas;
      if (linha.status === 'expirada') dia.expiradas += linha.reservas;
      dias.set(linha.dia, dia);
    }

    const listaEspera = Object.fromEntries(STATUS_ESPERA.map((s) => [s, 0])) as Relatorio['listaEspera'];
    listaEspera.total = 0;
    for (const { status, total } of espera) {
      listaEspera[status] += total;
      listaEspera.total += total;
    }

    return {
      periodo: { de: periodo.de, ate: periodo.ate },
      reservas,
      pessoasAtendidas,
      // Faltas: entre quem tinha mesa garantida e o dia chegou (veio ou não veio), quantos não vieram.
      taxaDeFaltas: porcentagem(reservas.nao_compareceu, reservas.concluida + reservas.nao_compareceu),
      taxaDeExpiracao: porcentagem(reservas.expirada, reservas.total),
      porDia: [...dias.values()].sort((a, b) => a.dia.localeCompare(b.dia)),
      horariosMaisProcurados: horarios,
      listaEspera,
    };
  }
}
