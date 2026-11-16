import { regras } from './regras';

// Contas de horário em minutos desde a meia-noite, no horário de Brasília.
const UM_DIA_MIN = 24 * 60;
const OFFSET_BRASILIA_MIN = -3 * 60;

function paraMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function paraTexto(minutos: number): string {
  const m = ((minutos % UM_DIA_MIN) + UM_DIA_MIN) % UM_DIA_MIN;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// Que horas são em Brasília para uma data qualquer: 23:00 UTC vira 20:00 (1200 minutos).
export function minutosEmBrasilia(data: Date): number {
  const utc = data.getUTCHours() * 60 + data.getUTCMinutes();
  return (((utc + OFFSET_BRASILIA_MIN) % UM_DIA_MIN) + UM_DIA_MIN) % UM_DIA_MIN;
}

export function horaEmBrasilia(data: Date): string {
  return paraTexto(minutosEmBrasilia(data));
}

// Tudo contado a partir da abertura. Fechar à 1h depois de abrir às 11h = 14 horas abertas.
const abertura = paraMinutos(regras.abertura);
const tempoAberto = (paraMinutos(regras.fechamento) - abertura + UM_DIA_MIN) % UM_DIA_MIN || UM_DIA_MIN;
// A última reserva tem que caber inteira antes de fechar: 01:00 - 2h30 = 22:30.
const ultimoInicio = tempoAberto - regras.duracaoReservaMin;

export const PRIMEIRO_HORARIO = paraTexto(abertura);
export const ULTIMO_HORARIO = paraTexto(abertura + ultimoInicio);

// Uma reserva pode começar nesse horário? Entre a abertura e o último horário, de 30 em 30 minutos.
export function horarioPermitido(data: Date): boolean {
  if (data.getUTCSeconds() !== 0 || data.getUTCMilliseconds() !== 0) return false;
  const desdeAbertura = (minutosEmBrasilia(data) - abertura + UM_DIA_MIN) % UM_DIA_MIN;
  return desdeAbertura <= ultimoInicio && desdeAbertura % regras.intervaloHorariosMin === 0;
}

// Todos os horários de reserva de um dia ("2026-11-20"): 11:00, 11:30, ..., 22:30.
export function horariosDoDia(dia: string): Date[] {
  const primeiro = new Date(`${dia}T${PRIMEIRO_HORARIO}:00${regras.fuso}`).getTime();
  const horarios: Date[] = [];
  for (let m = 0; m <= ultimoInicio; m += regras.intervaloHorariosMin) {
    horarios.push(new Date(primeiro + m * 60 * 1000));
  }
  return horarios;
}
