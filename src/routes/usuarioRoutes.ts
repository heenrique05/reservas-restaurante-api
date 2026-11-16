import { Router } from 'express';
import { usuarioService } from '../container';
import { TokenController } from '../controllers/TokenController';
import { UsuarioController } from '../controllers/UsuarioController';
import { loginRequired } from '../middlewares/loginRequired';

const usuarios = new UsuarioController(usuarioService);
const tokens = new TokenController(usuarioService);

export const usuarioRoutes = Router();
usuarioRoutes.post('/', usuarios.store);
usuarioRoutes.get('/eu', loginRequired, usuarios.perfil);

export const tokenRoutes = Router();
tokenRoutes.post('/', tokens.store);
