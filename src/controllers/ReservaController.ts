import type { Request, Response } from 'express';
import { regras } from '../config/regras';
import type { ReservaService } from '../services/ReservaService';
import { ok } from '../tipos/resposta';
import { validarId } from '../validacao/comuns';
import { validarDia, validarNovaReserva, validarStatus } from '../validacao/reservas';

export class ReservaController {
  constructor(private readonly service: ReservaService) {}

  // POST /reservas (público: é o cliente reservando)
  store = async (req: Request, res: Response) => {
    const reserva = await this.service.reservar(validarNovaReserva(req.body));
    res.status(201).json(ok(reserva, `Reserva feita. Pague o sinal em até ${regras.prazoSinalMin} minutos para confirmar`));
  };

  // GET /reservas?data=2026-11-20 (painel)
  index = async (req: Request, res: Response) => {
    const { inicio, fim, dia } = validarDia(req.query.data);
    res.json(ok(await this.service.listar(inicio, fim), `Reservas de ${dia}`));
  };

  // PATCH /reservas/:id/status (painel)
  alterarStatus = async (req: Request, res: Response) => {
    const { reserva, atendidosDaFila } = await this.service.mudarStatus(validarId(req.params.id), validarStatus(req.body));
    const aviso = atendidosDaFila > 0 ? `. ${atendidosDaFila} cliente(s) da lista de espera ganharam mesa` : '';
    res.json(ok(reserva, `Status atualizado${aviso}`));
  };
}
