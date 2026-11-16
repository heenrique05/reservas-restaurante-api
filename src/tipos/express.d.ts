import type { Papel } from './dominio';

// Declaration merging (seções 20 e 24): acrescenta campos no Request do Express.
// O middleware loginRequired preenche, e os controllers leem.
declare global {
  namespace Express {
    interface Request {
      usuarioId?: number;
      usuarioPapel?: Papel;
    }
  }
}

export {};
