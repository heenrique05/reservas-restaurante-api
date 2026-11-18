// Os mesmos formatos que a API devolve. Datas chegam como texto (JSON não tem Date).

export type RespostaApi<T> = { sucesso: boolean; dados?: T; mensagem?: string };

export type HorarioLivre = { horario: string; dataHora: string; mesasLivres: number };

export type DadosCliente = {
  nomeCliente: string;
  telefone: string;
  email: string;
  observacao: string;
};

export type Reserva = {
  id: number;
  nomeCliente: string;
  pessoas: number;
  dataHora: string;
  status: string;
  expiraEm?: string;
};

export type EntradaEspera = {
  id: number;
  nomeCliente: string;
  pessoas: number;
  dataHora: string;
  posicao: number;
};

// Um horário na grade: livre (dá pra reservar) ou lotado (dá pra entrar na fila).
export type Horario = { horario: string; livre: boolean };

// O resultado final que aparece na tela de confirmação.
export type Resultado =
  | { tipo: 'reserva'; reserva: Reserva; mensagem: string }
  | { tipo: 'espera'; entrada: EntradaEspera; mensagem: string };

// ---------- Painel do restaurante ----------

export type Papel = 'dono' | 'funcionario';
export type Usuario = { id: number; nome: string; email: string; papel: Papel };

export type StatusReserva = 'aguardando_sinal' | 'confirmada' | 'cancelada' | 'concluida' | 'nao_compareceu' | 'expirada';

export type ReservaDoPainel = {
  id: number;
  mesaNumero: number;
  nomeCliente: string;
  telefone: string;
  email?: string;
  pessoas: number;
  dataHora: string;
  status: StatusReserva;
  observacao?: string;
  expiraEm?: string;
};

export type StatusEspera = 'aguardando' | 'atendida' | 'cancelada';
export type EntradaDaFila = {
  id: number;
  nomeCliente: string;
  telefone: string;
  pessoas: number;
  dataHora: string;
  status: StatusEspera;
  observacao?: string;
  reservaId?: number;
  criadoEm: string;
};

export type Relatorio = {
  periodo: { de: string; ate: string };
  reservas: Record<StatusReserva, number> & { total: number };
  pessoasAtendidas: number;
  taxaDeFaltas: number | null;
  taxaDeExpiracao: number | null;
  porDia: { dia: string; total: number; concluidas: number; canceladas: number; faltas: number; expiradas: number }[];
  horariosMaisProcurados: { horario: string; reservas: number }[];
  listaEspera: Record<StatusEspera, number> & { total: number };
};
