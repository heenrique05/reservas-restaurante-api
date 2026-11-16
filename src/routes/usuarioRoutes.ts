import { Router } from 'express';
import { TokenController } from '../controllers/TokenController';
import { UsuarioController } from '../controllers/UsuarioController';
import { loginRequired } from '../middlewares/loginRequired';
import { KnexUsuarioRepository } from '../repositories/KnexUsuarioRepository';
import { UsuarioService } from '../services/UsuarioService';

// Aqui as peças são montadas e encaixadas (a luminária recebendo a lâmpada).
const service = new UsuarioService(new KnexUsuarioRepository());
const usuarios = new UsuarioController(service);
const tokens = new TokenController(service);

export const usuarioRoutes = Router();
usuarioRoutes.post('/', usuarios.store);
usuarioRoutes.get('/eu', loginRequired, usuarios.perfil);

export const tokenRoutes = Router();
tokenRoutes.post('/', tokens.store);
