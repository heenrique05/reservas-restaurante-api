import type { Request, Response } from 'express';
import type { UsuarioService } from '../services/UsuarioService';
import { ok } from '../tipos/resposta';
import { validarLogin } from '../validacao/validadores';

// Login: troca e-mail e senha por um token (igual ao TokenController do curso).
export class TokenController {
  constructor(private readonly service: UsuarioService) {}

  // POST /tokens
  store = async (req: Request, res: Response) => {
    const dados = validarLogin(req.body);
    const resultado = await this.service.autenticar(dados);
    res.json(ok(resultado, 'Login feito'));
  };
}
