import { regras, TRANSICOES } from '../config/regras';
import { AppError, Erros } from '../erros/AppError';
import type { ReservaRepository } from '../repositories/ReservaRepository';
import { textoDoStatus } from '../tipos/dominio';
import type { NovaReserva, Reserva, ReservaComMesa, StatusReserva } from '../tipos/dominio';

// Quem quiser saber quando uma mesa libera implementa isto (Observer, seção 28).
// Devolve quantos clientes foram atendidos com a mesa que liberou.
export interface OuvinteMesaLiberada {
  mesaLiberada(inicio: Date, termino: Date): Promise<number>;
}

export class ReservaService {
  constructor(
    private readonly repositorio: ReservaRepository,
    private readonly ouvintes: OuvinteMesaLiberada[] = [],
  ) {}

  // O cliente pede um horário; a API escolhe a menor mesa livre que caiba o grupo.
  async reservar(dados: NovaReserva): Promise<Reserva> {
    const termino = new Date(dados.dataHora.getTime() + regras.duracaoReservaMin * 60 * 1000);
    const reserva = await this.repositorio.criarEmMesaLivre({ ...dados, termino });
    if (!reserva) {
      throw Erros.conflito('Não há mesa livre para esse horário e número de pessoas. Entre na lista de espera');
    }
    return reserva;
  }

  listar(inicio: Date, fim: Date): Promise<ReservaComMesa[]> {
    return this.repositorio.listarPorPeriodo(inicio, fim);
  }

  async mudarStatus(id: number, novo: StatusReserva): Promise<{ reserva: Reserva; atendidosDaFila: number }> {
    const reserva = await this.repositorio.buscarPorId(id);
    if (!reserva) throw Erros.naoEncontrado('Reserva');

    if (!TRANSICOES[reserva.status].includes(novo)) {
      throw new AppError(
        `Não dá para passar de "${textoDoStatus[reserva.status]}" para "${textoDoStatus[novo]}"`,
        409,
      );
    }

    // Se alguém mudou o status entre a busca e agora, a atualização não acontece.
    const atualizada = await this.repositorio.atualizarStatus(id, reserva.status, novo);
    if (!atualizada) throw Erros.conflito('A reserva foi alterada por outra pessoa. Atualize e tente de novo');

    const atendidosDaFila = novo === 'cancelada' ? await this.avisarMesaLiberada(atualizada) : 0;
    return { reserva: atualizada, atendidosDaFila };
  }

  // O cancelamento já está salvo. Se avisar a fila der erro, o cancelamento continua valendo.
  private async avisarMesaLiberada(reserva: Reserva): Promise<number> {
    let atendidos = 0;
    for (const ouvinte of this.ouvintes) {
      try {
        atendidos += await ouvinte.mesaLiberada(reserva.dataHora, reserva.termino);
      } catch (erro) {
        console.error('Erro ao avisar que a mesa liberou:', erro);
      }
    }
    return atendidos;
  }
}
