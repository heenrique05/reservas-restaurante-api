import type { StatusEspera, StatusReserva } from '../tipos';

// Nome bonito de cada status e as ações que o painel oferece.
// As ações seguem a mesma regra da API (TRANSICOES em config/regras.ts):
// uma reserva cancelada, por exemplo, não volta a ser confirmada.

export const NOME_STATUS: Record<StatusReserva, string> = {
  aguardando_sinal: 'Aguardando sinal',
  confirmada: 'Confirmada',
  concluida: 'Veio',
  nao_compareceu: 'Não veio',
  cancelada: 'Cancelada',
  expirada: 'Expirou',
};

export const NOME_ESPERA: Record<StatusEspera, string> = {
  aguardando: 'Na fila',
  atendida: 'Ganhou mesa',
  cancelada: 'Saiu da fila',
};

// texto = o botão; feito = o aviso depois que deu certo.
type Acao = { para: StatusReserva; texto: string; feito: string; perigo?: boolean };

export const ACOES: Record<StatusReserva, Acao[]> = {
  aguardando_sinal: [
    { para: 'confirmada', texto: 'Sinal pago', feito: 'sinal pago, reserva confirmada' },
    { para: 'cancelada', texto: 'Cancelar', feito: 'reserva cancelada', perigo: true },
  ],
  confirmada: [
    { para: 'concluida', texto: 'Chegou', feito: 'chegou ao restaurante' },
    { para: 'nao_compareceu', texto: 'Não veio', feito: 'marcado como falta', perigo: true },
    { para: 'cancelada', texto: 'Cancelar', feito: 'reserva cancelada', perigo: true },
  ],
  cancelada: [],
  concluida: [],
  nao_compareceu: [],
  expirada: [],
};
