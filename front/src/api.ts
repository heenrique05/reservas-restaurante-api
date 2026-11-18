import type {
  DadosCliente,
  EntradaDaFila,
  EntradaEspera,
  HorarioLivre,
  Relatorio,
  Reserva,
  ReservaDoPainel,
  RespostaApi,
  StatusReserva,
  Usuario,
} from './tipos';

// O endereço vem do arquivo .env (VITE_API_URL). Sem ele, usa a API local.
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// Erro com a mensagem que a própria API mandou ("Esse horário acabou de lotar"...).
export class ErroApi extends Error {
  readonly status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.status = status;
  }
}

// O token do login (a "pulseirinha"). Quem cuida dele é o auth.tsx.
let token: string | null = null;
let aoPerderLogin: () => void = () => {};

export function usarToken(novo: string | null, quandoVencer?: () => void) {
  token = novo;
  if (quandoVencer) aoPerderLogin = quandoVencer;
}

// Toda chamada passa por aqui: monta o pedido, põe o token, lê o JSON e trata o erro num lugar só.
async function chamar<T>(caminho: string, opcoes: RequestInit = {}): Promise<{ dados: T; mensagem: string }> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      ...opcoes,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opcoes.headers,
      },
    });
  } catch {
    throw new ErroApi('Não foi possível falar com o restaurante. Confira se a API está ligada.', 0);
  }

  const corpo = (await resposta.json().catch(() => ({}))) as RespostaApi<T>;
  if (!resposta.ok || !corpo.sucesso) {
    // 401 com token = o login venceu. Volta pra tela de login.
    if (resposta.status === 401 && token) aoPerderLogin();
    throw new ErroApi(corpo.mensagem ?? 'Algo deu errado. Tente de novo.', resposta.status);
  }
  return { dados: corpo.dados as T, mensagem: corpo.mensagem ?? '' };
}

const enviar = (metodo: string, corpo?: unknown): RequestInit => ({
  method: metodo,
  body: corpo === undefined ? undefined : JSON.stringify(corpo),
});

export const api = {
  // ----- Site do cliente (sem login) -----
  horariosLivres: (dia: string, pessoas: number) =>
    chamar<HorarioLivre[]>(`/disponibilidade?data=${dia}&pessoas=${pessoas}`),

  reservar: (dados: DadosCliente, pessoas: number, dataHora: string) =>
    chamar<Reserva>('/reservas', enviar('POST', montarCorpo(dados, pessoas, dataHora))),

  entrarNaFila: (dados: DadosCliente, pessoas: number, dataHora: string) =>
    chamar<EntradaEspera>('/lista-espera', enviar('POST', montarCorpo(dados, pessoas, dataHora))),

  // ----- Painel (com login) -----
  entrar: (email: string, senha: string) =>
    chamar<{ token: string; usuario: Usuario }>('/tokens', enviar('POST', { email, senha })),

  reservasDoDia: (dia: string) => chamar<ReservaDoPainel[]>(`/reservas?data=${dia}`),

  mudarStatus: (id: number, status: StatusReserva) =>
    chamar<ReservaDoPainel>(`/reservas/${id}/status`, enviar('PATCH', { status })),

  filaDoDia: (dia: string) => chamar<EntradaDaFila[]>(`/lista-espera?data=${dia}`),

  tirarDaFila: (id: number) => chamar<EntradaDaFila>(`/lista-espera/${id}/cancelar`, enviar('PATCH')),

  relatorio: (de: string, ate: string) => chamar<Relatorio>(`/relatorios?de=${de}&ate=${ate}`),
};

// Campo opcional vazio não vai: a API entende "não informado".
function montarCorpo(dados: DadosCliente, pessoas: number, dataHora: string) {
  return {
    nomeCliente: dados.nomeCliente.trim(),
    telefone: dados.telefone,
    email: dados.email.trim() || undefined,
    observacao: dados.observacao.trim() || undefined,
    pessoas,
    dataHora,
  };
}
