import type { StatusEspera, StatusReserva } from '../tipos/dominio';

// Linhas já agrupadas pelo banco (GROUP BY, seção 31). As contas finais ficam no service.
export type ContagemDiaStatus = { dia: string; status: StatusReserva; reservas: number; pessoas: number };

export interface RelatorioRepository {
  reservasPorDiaEStatus(inicio: Date, fim: Date): Promise<ContagemDiaStatus[]>;
  horariosMaisProcurados(inicio: Date, fim: Date, limite: number): Promise<{ horario: string; reservas: number }[]>;
  listaEsperaPorStatus(inicio: Date, fim: Date): Promise<{ status: StatusEspera; total: number }[]>;
}
