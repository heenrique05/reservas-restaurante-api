import 'dotenv/config';

// Lê uma variável do .env que não pode faltar.
// Se faltar, o erro aparece logo, em vez de estourar no meio de uma requisição.
export function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`Faltou a variável ${nome} no arquivo .env`);
  }
  return valor;
}

export const env = {
  porta: Number(process.env.PORT ?? 3001),
  jwtSegredo: () => obrigatoria('JWT_SECRET'),
  jwtExpiracao: () => process.env.JWT_EXPIRACAO ?? '1d',
};
