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
