// Formato padrão de toda resposta da API.
// Seção 22: interface genérica. Escreve uma vez, serve pra qualquer dado.

export interface RespostaApi<T> {
  sucesso: boolean;
  dados?: T;
  mensagem?: string;
}

export function ok<T>(dados: T, mensagem?: string): RespostaApi<T> {
  return { sucesso: true, dados, mensagem };
}

export function falha(mensagem: string): RespostaApi<never> {
  return { sucesso: false, mensagem };
}
