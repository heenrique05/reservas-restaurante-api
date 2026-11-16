import { horaEmBrasilia, horariosDoDia } from '../config/horarios';
import { DURACAO_MS, FOLGA_MS } from '../config/regras';
import type { Ocupacao, ReservaRepository } from '../repositories/ReservaRepository';
import type { HorarioLivre } from '../tipos/dominio';

// Quantas mesas ficam livres das "inicio" até o fim da reserva, contando a folga.
// Função pura: recebe os dados, devolve o resultado, sem banco. Fácil de testar.
export function mesasLivresNoHorario(ocupacao: Ocupacao, inicio: Date): number {
  const termino = inicio.getTime() + DURACAO_MS;
  return ocupacao.mesas.filter(
    (mesaId) =>
      !ocupacao.reservas.some(
        (r) =>
          r.mesaId === mesaId &&
          r.inicio.getTime() < termino + FOLGA_MS &&
          r.termino.getTime() + FOLGA_MS > inicio.getTime(),
      ),
  ).length;
}

export class DisponibilidadeService {
  constructor(
    private readonly reservas: ReservaRepository,
    private readonly agora: () => Date = () => new Date(),
  ) {}

  // Os horários do dia que ainda têm mesa para o grupo. Horário que já passou não aparece.
  async horariosLivres(dia: string, pessoas: number): Promise<HorarioLivre[]> {
    const futuros = horariosDoDia(dia).filter((h) => h > this.agora());
    if (futuros.length === 0) return [];

    // Uma consulta só para o dia inteiro, em vez de uma por horário.
    const de = new Date(futuros[0].getTime() - FOLGA_MS);
    const ate = new Date(futuros[futuros.length - 1].getTime() + DURACAO_MS + FOLGA_MS);
    const ocupacao = await this.reservas.ocupacao(pessoas, de, ate);

    return futuros
      .map((dataHora) => ({ horario: horaEmBrasilia(dataHora), dataHora, mesasLivres: mesasLivresNoHorario(ocupacao, dataHora) }))
      .filter((h) => h.mesasLivres > 0);
  }
}
