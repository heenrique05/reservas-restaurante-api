import type { Request, Response } from 'express';
import type { DisponibilidadeService } from '../services/DisponibilidadeService';
import { ok } from '../tipos/resposta';
import { validarDia, validarPessoas } from '../validacao/reservas';

export class DisponibilidadeController {
  constructor(private readonly service: DisponibilidadeService) {}

  // GET /disponibilidade?data=2026-11-20&pessoas=3 (público: o cliente vê antes de reservar)
  index = async (req: Request, res: Response) => {
    const { dia } = validarDia(req.query.data);
    const pessoas = validarPessoas(req.query.pessoas);
    const horarios = await this.service.horariosLivres(dia, pessoas);
    const mensagem = horarios.length
      ? `${horarios.length} horário(s) com mesa para ${pessoas} pessoa(s) em ${dia}`
      : `Nenhum horário livre para ${pessoas} pessoa(s) em ${dia}. Dá para entrar na lista de espera`;
    res.json(ok(horarios, mensagem));
  };
}
