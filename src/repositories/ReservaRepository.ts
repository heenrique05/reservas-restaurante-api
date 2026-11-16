import type { NovaReserva, Reserva, ReservaComMesa, StatusReserva } from '../tipos/dominio';

// O que o repositório precisa para criar uma reserva: os dados do cliente, o fim e o prazo do sinal.
export type DadosParaReservar = NovaReserva & { termino: Date; expiraEm: Date };

// As mesas que servem para um grupo e as reservas que as ocupam num período.
export type Ocupacao = {
  mesas: number[];
  reservas: { mesaId: number; inicio: Date; termino: Date }[];
};

export interface ReservaRepository {
  // Procura uma mesa livre que caiba o grupo e já cria a reserva nela.
  // Devolve undefined quando não há mesa livre nesse horário.
  criarEmMesaLivre(dados: DadosParaReservar): Promise<Reserva | undefined>;
  // Só consulta, sem reservar: existe alguma mesa livre para esse grupo nesse horário?
  haMesaLivre(pessoas: number, inicio: Date, termino: Date): Promise<boolean>;
  // Para montar os horários disponíveis do dia de uma vez, sem uma consulta por horário.
  ocupacao(pessoas: number, de: Date, ate: Date): Promise<Ocupacao>;
  listarPorPeriodo(inicio: Date, fim: Date): Promise<ReservaComMesa[]>;
  buscarPorId(id: number): Promise<Reserva | undefined>;
  // Só muda se o status ainda for o "de". Se alguém mudou antes, devolve undefined.
  atualizarStatus(id: number, de: StatusReserva, para: StatusReserva): Promise<Reserva | undefined>;
  // Marca como "expirada" toda reserva cujo prazo do sinal já passou e devolve quais foram.
  expirarVencidas(): Promise<Reserva[]>;
}
