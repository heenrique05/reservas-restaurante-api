import { Router } from 'express';
import { ok } from '../tipos/resposta';

const router = Router();

router.get('/', (req, res) => {
  res.json(ok({ nome: 'API de reservas', versao: '1.0.0' }, 'API funcionando'));
});

export default router;
