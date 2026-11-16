import { Router } from 'express';
import { reservaService } from '../container';
import { ReservaController } from '../controllers/ReservaController';
import { loginRequired } from '../middlewares/loginRequired';

const reservas = new ReservaController(reservaService);

export const reservaRoutes = Router();
reservaRoutes.post('/', reservas.store); // o cliente reserva sem login
reservaRoutes.get('/', loginRequired, reservas.index);
reservaRoutes.patch('/:id/status', loginRequired, reservas.alterarStatus);
