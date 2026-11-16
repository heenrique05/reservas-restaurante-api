import { Router } from 'express';
import { ReservaController } from '../controllers/ReservaController';
import { loginRequired } from '../middlewares/loginRequired';
import { KnexReservaRepository } from '../repositories/KnexReservaRepository';
import { ReservaService } from '../services/ReservaService';

const reservas = new ReservaController(new ReservaService(new KnexReservaRepository()));

export const reservaRoutes = Router();
reservaRoutes.post('/', reservas.store); // o cliente reserva sem login
reservaRoutes.get('/', loginRequired, reservas.index);
reservaRoutes.patch('/:id/status', loginRequired, reservas.alterarStatus);
