import type { Request, Response } from 'express';
import { Erros } from '../erros/AppError';
import type { UsuarioService } from '../services/UsuarioService';
import { ok } from '../tipos/resposta';
import { validarCadastro } from '../validacao/validadores';

// O controller só traduz HTTP: lê o req, chama o service, responde.
// Métodos em arrow function para o "this" não se perder quando o Express chama.
export class UsuarioController {
  constructor(private readonly service: UsuarioService) {}

  // POST /usuarios
  store = async (req: Request, res: Response) => {
    const dados = validarCadastro(req.body);
    const usuario = await this.service.cadastrar(dados);
    res.status(201).json(ok(usuario, 'Usuário cadastrado'));
  };

  // GET /usuarios/eu (precisa de login)
  perfil = async (req: Request, res: Response) => {
    if (!req.usuarioId) throw Erros.naoAutorizado();
    const usuario = await this.service.buscarPerfil(req.usuarioId);
    res.json(ok(usuario));
  };
}
