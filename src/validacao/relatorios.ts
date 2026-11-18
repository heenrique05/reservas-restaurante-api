import { AppError } from '../erros/AppError';
import { regras } from '../config/regras';
import { texto } from './comuns';

const DIA = /^\d{4}-\d{2}-\d{2}$/;
const UM_DIA_MS = 24 * 60 * 60 * 1000;
const MAXIMO_DE_DIAS = 366;

function inicioDoDia(dia: string): Date {
  return new Date(`${dia}T00:00:00${regras.fuso}`);
}

// ?de=2026-11-01&ate=2026-11-30. Sem datas, usa o mês atual (no horário de Brasília).
export function validarPeriodo(deValor: unknown, ateValor: unknown, agora = new Date()) {
  const hojeEmBrasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [ano, mes] = hojeEmBrasilia.split('-').map(Number);
  const ultimoDiaDoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();

  const de = deValor === undefined ? `${hojeEmBrasilia.slice(0, 7)}-01` : texto(deValor);
  const ate = ateValor === undefined ? `${hojeEmBrasilia.slice(0, 7)}-${String(ultimoDiaDoMes).padStart(2, '0')}` : texto(ateValor);

  const inicio = inicioDoDia(de);
  const fimDoUltimoDia = inicioDoDia(ate);
  if (!DIA.test(de) || !DIA.test(ate) || Number.isNaN(inicio.getTime()) || Number.isNaN(fimDoUltimoDia.getTime())) {
    throw new AppError('Datas inválidas: use ?de=2026-11-01&ate=2026-11-30', 400);
  }
  if (inicio > fimDoUltimoDia) throw new AppError('A data "de" precisa ser antes da data "ate"', 400);

  const fim = new Date(fimDoUltimoDia.getTime() + UM_DIA_MS); // inclui o dia "ate" inteiro
  if ((fim.getTime() - inicio.getTime()) / UM_DIA_MS > MAXIMO_DE_DIAS) {
    throw new AppError(`O período pode ter no máximo ${MAXIMO_DE_DIAS} dias`, 400);
  }
  return { de, ate, inicio, fim };
}
