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
  criadoEm: Date;
};

// O que chega para criar um usuário (a senha já vem em hash).
export type NovoUsuario = Pick<Usuario, 'nome' | 'email' | 'senhaHash'> & Partial<Pick<Usuario, 'papel'>>;

export type Mesa = {
  readonly id: number;
  numero: number;
  lugares: number;
  ativa: boolean;
};

// Cadastro de mesa: tudo menos o id. Edição: qualquer parte disso.
export type NovaMesa = Omit<Mesa, 'id'>;
export type EditarMesa = Partial<NovaMesa>;

export type Reserva = {
  readonly id: number;
  mesaId: number;
  nomeCliente: string;
  telefone: string;
  email?: string;
  pessoas: number;
  dataHora: Date; // quando começa
  termino: Date; // quando a mesa fica livre de novo
  status: StatusReserva;
  observacao?: string;
  criadoEm: Date;
};

// O que o cliente manda pra reservar: quem decide a mesa, o fim,
// o status e o id é a API (e o banco).
export type NovaReserva = Omit<Reserva, 'id' | 'mesaId' | 'termino' | 'status' | 'criadoEm'>;

// A listagem do painel traz o número da mesa junto (JOIN da seção 31).
export type ReservaComMesa = Reserva & { mesaNumero: number };

// Lista de espera: quem queria um horário lotado.
// "atendida" = ganhou uma mesa quando alguém cancelou.
export type StatusEspera = 'aguardando' | 'atendida' | 'cancelada';

// Os mesmos dados de quem reserva, mais o andamento na fila.
export type EntradaEspera = NovaReserva & {
  readonly id: number;
  status: StatusEspera;
  reservaId?: number; // a reserva criada quando a pessoa foi atendida
  criadoEm: Date;
};

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
