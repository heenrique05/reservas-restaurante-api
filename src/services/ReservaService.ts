import { regras, TRANSICOES } from '../config/regras';
import { AppError, Erros } from '../erros/AppError';
import type { ReservaRepository } from '../repositories/ReservaRepository';
import { textoDoStatus } from '../tipos/dominio';
import type { NovaReserva, Reserva, ReservaComMesa, StatusReserva } from '../tipos/dominio';

export class ReservaService {
  constructor(private readonly repositorio: ReservaRepository) {}

  // O cliente pede um horário; a API escolhe a menor mesa livre que caiba o grupo.
  async reservar(dados: NovaReserva): Promise<Reserva> {
    const termino = new Date(dados.dataHora.getTime() + regras.duracaoReservaMin * 60 * 1000);
    const reserva = await this.repositorio.criarEmMesaLivre({ ...dados, termino });
    if (!reserva) throw Erros.conflito('Não há mesa livre para esse horário e número de pessoas');
    return reserva;
  }

  listar(inicio: Date, fim: Date): Promise<ReservaComMesa[]> {
    return this.repositorio.listarPorPeriodo(inicio, fim);
  }

  async mudarStatus(id: number, novo: StatusReserva): Promise<Reserva> {
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
    return atualizada;
  }
}
