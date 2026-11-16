import { Router } from 'express';
import { listaEsperaService } from '../container';
import { ListaEsperaController } from '../controllers/ListaEsperaController';
import { loginRequired } from '../middlewares/loginRequired';

const lista = new ListaEsperaController(listaEsperaService);

export const listaEsperaRoutes = Router();
listaEsperaRoutes.post('/', lista.store); // o cliente entra na fila sem login
listaEsperaRoutes.get('/', loginRequired, lista.index);
listaEsperaRoutes.patch('/:id/cancelar', loginRequired, lista.cancelar);
