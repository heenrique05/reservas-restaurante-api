import { Router } from 'express';
import { MesaController } from '../controllers/MesaController';
import { loginRequired } from '../middlewares/loginRequired';
import { somenteDono } from '../middlewares/somenteDono';
import { KnexMesaRepository } from '../repositories/KnexMesaRepository';
import { MesaService } from '../services/MesaService';

const mesas = new MesaController(new MesaService(new KnexMesaRepository()));

// Os middlewares rodam em fila, um depois do outro (Chain of Responsibility, seção 28).
export const mesaRoutes = Router();
mesaRoutes.get('/', loginRequired, mesas.index);
mesaRoutes.post('/', loginRequired, somenteDono, mesas.store);
mesaRoutes.patch('/:id', loginRequired, somenteDono, mesas.update);
