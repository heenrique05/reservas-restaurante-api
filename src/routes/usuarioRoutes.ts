import { Router } from 'express';
import { usuarioService } from '../container';
import { TokenController } from '../controllers/TokenController';
import { UsuarioController } from '../controllers/UsuarioController';
import { loginOpcional, loginRequired } from '../middlewares/loginRequired';
import { somenteDono } from '../middlewares/somenteDono';

const usuarios = new UsuarioController(usuarioService);
const tokens = new TokenController(usuarioService);

export const usuarioRoutes = Router();
usuarioRoutes.post('/', loginOpcional, usuarios.store);
usuarioRoutes.get('/', loginRequired, somenteDono, usuarios.index);
usuarioRoutes.get('/eu', loginRequired, usuarios.perfil);

export const tokenRoutes = Router();
tokenRoutes.post('/', tokens.store);
