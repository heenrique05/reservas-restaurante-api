import { AppError } from '../erros/AppError';
import { horarioPermitido, PRIMEIRO_HORARIO, ULTIMO_HORARIO } from '../config/horarios';
import { regras } from '../config/regras';
import type { NovaReserva, StatusReserva } from '../tipos/dominio';
import { textoDoStatus } from '../tipos/dominio';
import { falharSeHouver, inteiro, texto } from './comuns';

// Regex (seção 17).
// Telefone com DDD, só números: 11 98765-4321 vira 11987654321.
const TELEFONE = /^[1-9]{2}\d{8,9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Data e hora com fuso obrigatório (Z ou -03:00), para não haver dúvida de que horário é.
const DATA_HORA_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

const UM_DIA_MS = 24 * 60 * 60 * 1000;

export function validarNovaReserva(corpo: unknown, agora = new Date()): NovaReserva {
  const dados = (corpo ?? {}) as Record<string, unknown>;
  const nomeCliente = texto(dados.nomeCliente);
  const telefone = texto(dados.telefone).replace(/\D/g, ''); // tira espaço, traço e parênteses
  const email = texto(dados.email).toLowerCase();
  const pessoas = inteiro(dados.pessoas, 1, regras.maxPessoas);
  const observacao = texto(dados.observacao);
  const dataHoraTexto = texto(dados.dataHora);
  const dataHora = new Date(dataHoraTexto);
  const problemas: string[] = [];

  if (nomeCliente.length < 2 || nomeCliente.length > 100) problemas.push('O nome precisa ter entre 2 e 100 caracteres');
  if (!TELEFONE.test(telefone)) problemas.push('Telefone inválido: use o DDD e o número, como 11987654321');
  if (email && !EMAIL.test(email)) problemas.push('E-mail inválido');
  if (pessoas === undefined) problemas.push(`O número de pessoas precisa ser de 1 a ${regras.maxPessoas}`);
  if (observacao.length > 500) problemas.push('A observação pode ter no máximo 500 caracteres');

  if (!DATA_HORA_ISO.test(dataHoraTexto) || Number.isNaN(dataHora.getTime())) {
    problemas.push('Data e hora inválidas: use o formato 2026-11-20T20:00:00-03:00');
  } else if (dataHora <= agora) {
    problemas.push('A reserva precisa ser para um horário futuro');
  } else if (dataHora.getTime() - agora.getTime() > regras.antecedenciaMaxDias * UM_DIA_MS) {
    problemas.push(`Só é possível reservar com até ${regras.antecedenciaMaxDias} dias de antecedência`);
  } else if (!horarioPermitido(dataHora)) {
    problemas.push(
      `Escolha um horário entre ${PRIMEIRO_HORARIO} e ${ULTIMO_HORARIO}, de ${regras.intervaloHorariosMin} em ${regras.intervaloHorariosMin} minutos`,
    );
  }
  falharSeHouver(problemas);

  return {
    nomeCliente,
    telefone,
    email: email || undefined,
    pessoas: pessoas!,
    dataHora,
    observacao: observacao || undefined,
  };
}

export function validarStatus(corpo: unknown): StatusReserva {
  const status = (corpo as Record<string, unknown> | undefined)?.status;
  // Confere se o texto é uma das chaves do Record. O Object.hasOwn olha só as chaves
  // escritas no objeto; o "in" também aceitaria nomes herdados, como "toString".
  if (typeof status !== 'string' || !Object.hasOwn(textoDoStatus, status)) {
    throw new AppError(`Status inválido. Use: ${Object.keys(textoDoStatus).join(', ')}`, 400);
  }
  return status as StatusReserva;
}

// ?data=2026-11-20 vira o intervalo daquele dia no horário de Brasília.
// Sem data, usa o dia de hoje.
export function validarDia(valor: unknown, agora = new Date()): { inicio: Date; fim: Date; dia: string } {
  const offsetMs = -3 * 60 * 60 * 1000;
  const hoje = new Date(agora.getTime() + offsetMs).toISOString().slice(0, 10);
  const dia = valor === undefined ? hoje : texto(valor);

  const inicio = new Date(`${dia}T00:00:00${regras.fuso}`);
  if (!DIA.test(dia) || Number.isNaN(inicio.getTime())) {
    throw new AppError('Data inválida: use o formato 2026-11-20', 400);
  }
  return { inicio, fim: new Date(inicio.getTime() + UM_DIA_MS), dia };
}

// ?pessoas=3 chega como texto.
export function validarPessoas(valor: unknown): number {
  const pessoas = inteiro(valor, 1, regras.maxPessoas);
  if (pessoas === undefined) throw new AppError(`Informe quantas pessoas, de 1 a ${regras.maxPessoas}`, 400);
  return pessoas;
}
