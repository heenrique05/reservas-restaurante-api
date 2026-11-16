import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { Papel } from '../tipos/dominio';

// O que vai dentro do JWT. Nada de senha: o conteúdo do token é legível.
export type ConteudoToken = { id: number; papel: Papel };

export function gerarToken(conteudo: ConteudoToken): string {
  return jwt.sign(conteudo, env.jwtSegredo(), {
    expiresIn: env.jwtExpiracao() as SignOptions['expiresIn'],
  });
}

// Lança erro se o token foi alterado ou venceu.
export function verificarToken(token: string): ConteudoToken {
  const dados = jwt.verify(token, env.jwtSegredo()) as jwt.JwtPayload & ConteudoToken;
  return { id: dados.id, papel: dados.papel };
}
