import type { Request, Response } from 'express';
import type { MesaService } from '../services/MesaService';
import { ok } from '../tipos/resposta';
import { validarId } from '../validacao/comuns';
import { validarEdicaoMesa, validarNovaMesa } from '../validacao/mesas';

export class MesaController {
  constructor(private readonly service: MesaService) {}

  // GET /mesas
  index = async (_req: Request, res: Response) => {
    res.json(ok(await this.service.listar()));
  };

  // POST /mesas
  store = async (req: Request, res: Response) => {
    const mesa = await this.service.criar(validarNovaMesa(req.body));
    res.status(201).json(ok(mesa, 'Mesa cadastrada'));
  };

  // PATCH /mesas/:id
  update = async (req: Request, res: Response) => {
    const mesa = await this.service.atualizar(validarId(req.params.id), validarEdicaoMesa(req.body));
    res.json(ok(mesa, 'Mesa atualizada'));
  };
}
