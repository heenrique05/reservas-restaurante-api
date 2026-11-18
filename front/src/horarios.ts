// As mesmas regras de horário da API (src/config/horarios.ts lá no back-end).
// Reservas das 11:00 às 22:30, de 30 em 30 minutos, no horário de Brasília.

export const PRIMEIRO = 11 * 60;
export const ULTIMO = 22 * 60 + 30;
export const INTERVALO = 30;
export const MAX_PESSOAS = 20;
export const ANTECEDENCIA_MAX_DIAS = 60;

const UM_DIA_MS = 24 * 60 * 60 * 1000;
const FUSO_MS = -3 * 60 * 60 * 1000;

// "2026-11-20" de hoje, no horário de Brasília (mesmo se o computador estiver em outro fuso).
export function hojeEmBrasilia(agora = new Date()): string {
  return new Date(agora.getTime() + FUSO_MS).toISOString().slice(0, 10);
}

export function somarDias(dia: string, dias: number): string {
  return new Date(new Date(`${dia}T12:00:00Z`).getTime() + dias * UM_DIA_MS).toISOString().slice(0, 10);
}

// ["11:00", "11:30", ..., "22:30"]
export function todosOsHorarios(): string[] {
  const lista: string[] = [];
  for (let m = PRIMEIRO; m <= ULTIMO; m += INTERVALO) {
    lista.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return lista;
}

// "2026-11-20" + "20:00" vira "2026-11-20T20:00:00-03:00", o formato que a API pede.
export function dataHoraIso(dia: string, horario: string): string {
  return `${dia}T${horario}:00-03:00`;
}

export function jaPassou(dia: string, horario: string, agora = new Date()): boolean {
  return new Date(dataHoraIso(dia, horario)) <= agora;
}

// "2026-11-20" (ou uma data e hora completa) vira "sexta-feira, 20 de novembro"
export function diaPorExtenso(dia: string): string {
  const data = dia.length === 10 ? new Date(`${dia}T12:00:00-03:00`) : new Date(dia);
  return data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  });
}

export function horaDe(dataHoraIsoTexto: string): string {
  return new Date(dataHoraIsoTexto).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}
