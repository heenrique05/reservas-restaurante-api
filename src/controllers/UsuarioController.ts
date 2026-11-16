import type { Request, Response } from 'express';
import { Erros } from '../erros/AppError';
import type { UsuarioService } from '../services/UsuarioService';
import { ok } from '../tipos/resposta';
import { validarCadastro } from '../validacao/validadores';

// O controller só traduz HTTP: lê o req, chama o service, responde.
// Métodos em arrow function para o "this" não se perder quando o Express chama.
export class UsuarioController {
  constructor(private readonly service: UsuarioService) {}

  // POST /usuarios (sem login só no primeiro cadastro; depois, só o dono)
  store = async (req: Request, res: Response) => {
    const dados = validarCadastro(req.body);
    const quemCadastra = req.usuarioPapel ? { papel: req.usuarioPapel } : undefined;
    const usuario = await this.service.cadastrar(dados, quemCadastra);
    const mensagem = usuario.papel === 'dono' ? 'Dono cadastrado' : 'Funcionário cadastrado';
    res.status(201).json(ok(usuario, mensagem));
  };

  // GET /usuarios (só o dono): a equipe do restaurante
  index = async (_req: Request, res: Response) => {
    res.json(ok(await this.service.listarEquipe()));
  };

  // GET /usuarios/eu (precisa de login)
  perfil = async (req: Request, res: Response) => {
    if (!req.usuarioId) throw Erros.naoAutorizado();
    const usuario = await this.service.buscarPerfil(req.usuarioId);
    res.json(ok(usuario));
  };
}
