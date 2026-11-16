import type { RequestHandler } from 'express';
import { verificarToken } from '../auth/token';
import { Erros } from '../erros/AppError';

// Confere a "pulseira" (o JWT) antes de deixar passar para a rota.
// O cabeçalho vem assim: Authorization: Bearer eyJhbGciOi...
export const loginRequired: RequestHandler = (req, _res, next) => {
  const [tipo, token] = (req.headers.authorization ?? '').split(' ');

  if (tipo !== 'Bearer' || !token) throw Erros.naoAutorizado();

  try {
    const { id, papel } = verificarToken(token);
    req.usuarioId = id;
    req.usuarioPapel = papel;
  } catch {
    throw Erros.naoAutorizado();
  }

  next();
};
