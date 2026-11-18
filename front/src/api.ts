import type { DadosCliente, EntradaEspera, HorarioLivre, Reserva, RespostaApi } from './tipos';

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

// Toda chamada passa por aqui: monta o pedido, lê o JSON e trata o erro num lugar só.
async function chamar<T>(caminho: string, opcoes: RequestInit = {}): Promise<{ dados: T; mensagem: string }> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      ...opcoes,
      headers: { 'Content-Type': 'application/json', ...opcoes.headers },
    });
  } catch {
    throw new ErroApi('Não foi possível falar com o restaurante. Confira se a API está ligada.', 0);
  }

  const corpo = (await resposta.json().catch(() => ({}))) as RespostaApi<T>;
  if (!resposta.ok || !corpo.sucesso) {
    throw new ErroApi(corpo.mensagem ?? 'Algo deu errado. Tente de novo.', resposta.status);
  }
  return { dados: corpo.dados as T, mensagem: corpo.mensagem ?? '' };
}

export const api = {
  horariosLivres: (dia: string, pessoas: number) =>
    chamar<HorarioLivre[]>(`/disponibilidade?data=${dia}&pessoas=${pessoas}`),

  reservar: (dados: DadosCliente, pessoas: number, dataHora: string) =>
    chamar<Reserva>('/reservas', { method: 'POST', body: JSON.stringify(montarCorpo(dados, pessoas, dataHora)) }),

  entrarNaFila: (dados: DadosCliente, pessoas: number, dataHora: string) =>
    chamar<EntradaEspera>('/lista-espera', { method: 'POST', body: JSON.stringify(montarCorpo(dados, pessoas, dataHora)) }),
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
