import { Router } from 'express';
import { relatorioService } from '../container';
import { RelatorioController } from '../controllers/RelatorioController';
import { loginRequired } from '../middlewares/loginRequired';
import { somenteDono } from '../middlewares/somenteDono';

const relatorios = new RelatorioController(relatorioService);

export const relatorioRoutes = Router();
relatorioRoutes.get('/', loginRequired, somenteDono, relatorios.index);
