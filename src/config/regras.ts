import type { StatusReserva } from '../tipos/dominio';

// As regras do restaurante num lugar só. Mudou a regra, muda aqui.
export const regras = {
  duracaoReservaMin: 120, // quanto tempo uma reserva ocupa a mesa
  maxPessoas: 20,
  antecedenciaMaxDias: 60, // até quantos dias à frente dá para reservar
  fuso: '-03:00', // horário de Brasília
};

// Status que ainda seguram a mesa. Cancelada ou concluída libera.
export const STATUS_QUE_OCUPAM: StatusReserva[] = ['aguardando_sinal', 'confirmada'];

// Para onde cada status pode ir (seção 28: a ideia do padrão State).
// Record (seção 22): se aparecer um status novo e ele faltar aqui, o TypeScript avisa.
export const TRANSICOES: Record<StatusReserva, StatusReserva[]> = {
  aguardando_sinal: ['confirmada', 'cancelada'],
  confirmada: ['concluida', 'nao_compareceu', 'cancelada'],
  cancelada: [],
  concluida: [],
  nao_compareceu: [],
};
