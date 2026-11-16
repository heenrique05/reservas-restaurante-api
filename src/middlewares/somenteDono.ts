import type { RequestHandler } from 'express';
import { Erros } from '../erros/AppError';

// Vem sempre depois do loginRequired: ele diz quem é, este diz se pode.
// 401 = não sei quem você é. 403 = sei quem é, mas você não pode.
export const somenteDono: RequestHandler = (req, _res, next) => {
  if (req.usuarioPapel !== 'dono') throw Erros.semPermissao();
  next();
};
