import type { Request, Response } from 'express';
import type { RelatorioService } from '../services/RelatorioService';
import { ok } from '../tipos/resposta';
import { validarPeriodo } from '../validacao/relatorios';

export class RelatorioController {
  constructor(private readonly service: RelatorioService) {}

  // GET /relatorios?de=2026-11-01&ate=2026-11-30 (só o dono). Sem datas, o mês atual.
  index = async (req: Request, res: Response) => {
    const periodo = validarPeriodo(req.query.de, req.query.ate);
    res.json(ok(await this.service.gerar(periodo), `Relatório de ${periodo.de} a ${periodo.ate}`));
  };
}
