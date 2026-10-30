// Tipos principais do sistema de reservas.
// Seção 19: type alias, literais em vez de enum, readonly, campo opcional.
// Seção 22: Omit, Partial e Pick pra não reescrever o mesmo tipo várias vezes.

export type Papel = 'dono' | 'funcionario';

export type StatusReserva =
  | 'aguardando_sinal'
  | 'confirmada'
  | 'cancelada'
  | 'concluida'
  | 'nao_compareceu';

export type Usuario = {
  readonly id: number;
  nome: string;
  email: string;
  senhaHash: string;
  papel: Papel;
};

export type Mesa = {
  readonly id: number;
  numero: number;
  lugares: number;
  ativa: boolean;
};

export type Reserva = {
  readonly id: number;
  mesaId: number;
  nomeCliente: string;
  telefone: string;
  email?: string;
  pessoas: number;
  dataHora: Date;
  status: StatusReserva;
  observacao?: string;
};

// O que o cliente manda pra criar uma reserva: sem id (vem do banco)
// e sem status (a API decide que começa aguardando o sinal).
export type NovaReserva = Omit<Reserva, 'id' | 'status'>;

// Edição parcial (rota PATCH): a pessoa muda só o que precisar.
export type EditarReserva = Partial<NovaReserva>;

// O que pode ir pro front sobre um usuário: nunca a senha.
export type UsuarioPublico = Omit<Usuario, 'senhaHash'>;

// Resumo pra listagem no painel.
export type ReservaResumo = Pick<Reserva, 'id' | 'nomeCliente' | 'pessoas' | 'dataHora' | 'status'>;

// Status que ainda ocupam a mesa (seção 22: Exclude).
export type StatusAtivo = Exclude<StatusReserva, 'cancelada' | 'concluida' | 'nao_compareceu'>;

// Texto mostrado pra cada status (seção 22: Record).
// Se um status novo for criado lá em cima e não estiver aqui, o TypeScript avisa.
export const textoDoStatus: Record<StatusReserva, string> = {
  aguardando_sinal: 'Aguardando pagamento do sinal',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  concluida: 'Concluída',
  nao_compareceu: 'Cliente não compareceu',
};
