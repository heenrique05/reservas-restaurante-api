import type { StatusReserva } from '../tipos/dominio';

// As regras do restaurante num lugar só. Mudou a regra, muda aqui.
export const regras = {
  duracaoReservaMin: 150, // 2h30 com a mesa
  folgaEntreReservasMin: 15, // tempo para limpar e arrumar a mesa antes da próxima reserva
  prazoSinalMin: 5, // quem reserva direto está com o celular na mão: 5 minutos para pagar
  prazoSinalFilaMin: 15, // quem ganha a mesa pela fila precisa ver o aviso primeiro: 15 minutos
  maxPessoas: 20,
  antecedenciaMaxDias: 60, // até quantos dias à frente dá para reservar
  fuso: '-03:00', // horário de Brasília
  abertura: '11:00',
  fechamento: '01:00', // 1h da manhã do dia seguinte
  intervaloHorariosMin: 30, // reservas às 11:00, 11:30, 12:00...
};

const MINUTO_MS = 60 * 1000;
export const DURACAO_MS = regras.duracaoReservaMin * MINUTO_MS;
export const FOLGA_MS = regras.folgaEntreReservasMin * MINUTO_MS;
export const PRAZO_SINAL_MS = regras.prazoSinalMin * MINUTO_MS;
export const PRAZO_SINAL_FILA_MS = regras.prazoSinalFilaMin * MINUTO_MS;

// Quando a reserva vira um destes, a mesa deixa de estar ocupada e a lista de espera é avisada.
export const STATUS_QUE_LIBERAM: StatusReserva[] = ['cancelada', 'concluida', 'nao_compareceu', 'expirada'];

// Para onde cada status pode ir (seção 28: a ideia do padrão State).
// Record (seção 22): se aparecer um status novo e ele faltar aqui, o TypeScript avisa.
// "expirada" não aparece como destino: só o sistema expira uma reserva, quando o prazo do sinal acaba.
export const TRANSICOES: Record<StatusReserva, StatusReserva[]> = {
  aguardando_sinal: ['confirmada', 'cancelada'],
  confirmada: ['concluida', 'nao_compareceu', 'cancelada'],
  cancelada: [],
  concluida: [],
  nao_compareceu: [],
  expirada: [],
};
