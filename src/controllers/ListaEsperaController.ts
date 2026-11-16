import type { Request, Response } from 'express';
import type { ListaEsperaService } from '../services/ListaEsperaService';
import { ok } from '../tipos/resposta';
import { validarId } from '../validacao/comuns';
import { validarDia, validarNovaReserva } from '../validacao/reservas';

export class ListaEsperaController {
  constructor(private readonly service: ListaEsperaService) {}

  // POST /lista-espera (público: os mesmos dados de uma reserva)
  store = async (req: Request, res: Response) => {
    const { entrada, posicao } = await this.service.entrar(validarNovaReserva(req.body));
    res.status(201).json(ok({ ...entrada, posicao }, `Você é o número ${posicao} da lista de espera`));
  };

  // GET /lista-espera?data=2026-11-20 (painel)
  index = async (req: Request, res: Response) => {
    const { inicio, fim, dia } = validarDia(req.query.data);
    res.json(ok(await this.service.listar(inicio, fim), `Lista de espera de ${dia}`));
  };

  // PATCH /lista-espera/:id/cancelar (painel)
  cancelar = async (req: Request, res: Response) => {
    res.json(ok(await this.service.cancelar(validarId(req.params.id)), 'Saiu da lista de espera'));
  };
}
