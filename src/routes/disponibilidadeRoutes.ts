import { Router } from 'express';
import { disponibilidadeService } from '../container';
import { DisponibilidadeController } from '../controllers/DisponibilidadeController';

const disponibilidade = new DisponibilidadeController(disponibilidadeService);

export const disponibilidadeRoutes = Router();
disponibilidadeRoutes.get('/', disponibilidade.index); // sem login: é o cliente escolhendo o horário
