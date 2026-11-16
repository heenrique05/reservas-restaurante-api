import type { NovaReserva, Reserva, ReservaComMesa, StatusReserva } from '../tipos/dominio';

export interface ReservaRepository {
  // Procura uma mesa livre que caiba o grupo e já cria a reserva nela.
  // Devolve undefined quando não há mesa livre nesse horário.
  criarEmMesaLivre(dados: NovaReserva & { termino: Date }): Promise<Reserva | undefined>;
  // Só consulta, sem reservar: existe alguma mesa livre para esse grupo nesse horário?
  haMesaLivre(pessoas: number, inicio: Date, termino: Date): Promise<boolean>;
  listarPorPeriodo(inicio: Date, fim: Date): Promise<ReservaComMesa[]>;
  buscarPorId(id: number): Promise<Reserva | undefined>;
  // Só muda se o status ainda for o "de". Se alguém mudou antes, devolve undefined.
  atualizarStatus(id: number, de: StatusReserva, para: StatusReserva): Promise<Reserva | undefined>;
}
