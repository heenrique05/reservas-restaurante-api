import { AppError } from '../erros/AppError';

export function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

// Número inteiro dentro de um intervalo, ou undefined se não for.
export function inteiro(valor: unknown, min: number, max: number): number | undefined {
  const n = typeof valor === 'string' && /^\d+$/.test(valor) ? Number(valor) : valor;
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max ? n : undefined;
}

// O :id que vem na rota (/mesas/5) chega como texto.
export function validarId(valor: unknown): number {
  const id = inteiro(valor, 1, 2_147_483_647);
  if (id === undefined) throw new AppError('Id inválido', 400);
  return id;
}

export function falharSeHouver(problemas: string[]): void {
  if (problemas.length) throw new AppError(problemas.join('. '), 400);
}
