import { AppError } from '../erros/AppError';
import { regras } from '../config/regras';
import type { EditarMesa, NovaMesa } from '../tipos/dominio';
import { falharSeHouver, inteiro } from './comuns';

export function validarNovaMesa(corpo: unknown): NovaMesa {
  const dados = (corpo ?? {}) as Record<string, unknown>;
  const numero = inteiro(dados.numero, 1, 999);
  const lugares = inteiro(dados.lugares, 1, regras.maxPessoas);
  const problemas: string[] = [];

  if (numero === undefined) problemas.push('O número da mesa precisa ser um inteiro de 1 a 999');
  if (lugares === undefined) problemas.push(`Os lugares precisam ser um inteiro de 1 a ${regras.maxPessoas}`);
  if (dados.ativa !== undefined && typeof dados.ativa !== 'boolean') problemas.push('"ativa" precisa ser true ou false');
  falharSeHouver(problemas);

  return { numero: numero!, lugares: lugares!, ativa: dados.ativa === undefined ? true : (dados.ativa as boolean) };
}

// Na edição, cada campo é opcional, mas pelo menos um tem que vir.
export function validarEdicaoMesa(corpo: unknown): EditarMesa {
  const dados = (corpo ?? {}) as Record<string, unknown>;
  const edicao: EditarMesa = {};
  const problemas: string[] = [];

  if (dados.numero !== undefined) {
    const numero = inteiro(dados.numero, 1, 999);
    if (numero === undefined) problemas.push('O número da mesa precisa ser um inteiro de 1 a 999');
    else edicao.numero = numero;
  }
  if (dados.lugares !== undefined) {
    const lugares = inteiro(dados.lugares, 1, regras.maxPessoas);
    if (lugares === undefined) problemas.push(`Os lugares precisam ser um inteiro de 1 a ${regras.maxPessoas}`);
    else edicao.lugares = lugares;
  }
  if (dados.ativa !== undefined) {
    if (typeof dados.ativa !== 'boolean') problemas.push('"ativa" precisa ser true ou false');
    else edicao.ativa = dados.ativa;
  }
  falharSeHouver(problemas);

  if (Object.keys(edicao).length === 0) throw new AppError('Envie numero, lugares ou ativa', 400);
  return edicao;
}
