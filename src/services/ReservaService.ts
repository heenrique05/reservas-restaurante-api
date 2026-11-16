import { DURACAO_MS, PRAZO_SINAL_MS, STATUS_QUE_LIBERAM, TRANSICOES } from '../config/regras';
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
    private readonly agora: () => Date = () => new Date(),
  ) {}

  // O cliente pede um horário; a API escolhe a menor mesa livre que caiba o grupo.
  // A mesa fica segura por 5 minutos, o tempo de pagar o sinal.
  async reservar(dados: NovaReserva): Promise<Reserva> {
    const reserva = await this.repositorio.criarEmMesaLivre({
      ...dados,
      termino: new Date(dados.dataHora.getTime() + DURACAO_MS),
      expiraEm: new Date(this.agora().getTime() + PRAZO_SINAL_MS),
    });
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

    // O prazo acabou e a varredura ainda não passou: a mesa já pode estar com outra pessoa.
    const prazoVencido = reserva.expiraEm !== undefined && reserva.expiraEm <= this.agora();
    if (novo === 'confirmada' && prazoVencido) {
      throw Erros.conflito('O prazo para pagar o sinal acabou. Faça uma nova reserva');
    }

    // Se alguém mudou o status entre a busca e agora, a atualização não acontece.
    const atualizada = await this.repositorio.atualizarStatus(id, reserva.status, novo);
    if (!atualizada) throw Erros.conflito('A reserva foi alterada por outra pessoa. Atualize e tente de novo');

    const atendidosDaFila = STATUS_QUE_LIBERAM.includes(novo) ? await this.avisarMesaLiberada(atualizada) : 0;
    return { reserva: atualizada, atendidosDaFila };
  }

  // Roda sozinha de tempos em tempos (veja o server.ts): quem não pagou o sinal no prazo
  // perde a reserva, e a mesa vai para o próximo da lista de espera.
  async expirarVencidas(): Promise<{ expiradas: number; atendidosDaFila: number }> {
    const expiradas = await this.repositorio.expirarVencidas();
    let atendidosDaFila = 0;
    for (const reserva of expiradas) {
      atendidosDaFila += await this.avisarMesaLiberada(reserva);
    }
    return { expiradas: expiradas.length, atendidosDaFila };
  }

  // O status já está salvo. Se avisar a fila der erro, a mudança continua valendo.
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
