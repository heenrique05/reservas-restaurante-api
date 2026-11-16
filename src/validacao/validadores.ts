import { AppError } from '../erros/AppError';
import type { Papel } from '../tipos/dominio';

// Expressões regulares da seção 17.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TEM_LETRA = /[a-zA-Z]/;
const TEM_NUMERO = /\d/;

export type DadosCadastro = { nome: string; email: string; senha: string; papel?: Papel };
export type DadosLogin = { email: string; senha: string };

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

export function normalizarEmail(valor: unknown): string {
  return texto(valor).toLowerCase();
}

// Valida tudo e devolve todos os problemas de uma vez,
// para o front mostrar as mensagens juntas.
export function validarCadastro(corpo: unknown): DadosCadastro {
  const dados = (corpo ?? {}) as Record<string, unknown>;
  const nome = texto(dados.nome);
  const email = normalizarEmail(dados.email);
  const senha = typeof dados.senha === 'string' ? dados.senha : '';
  const problemas: string[] = [];

  if (nome.length < 3 || nome.length > 100) problemas.push('O nome precisa ter entre 3 e 100 caracteres');
  if (!EMAIL.test(email)) problemas.push('E-mail inválido');
  // O bcrypt só usa os primeiros 72 bytes da senha, por isso o limite.
  if (senha.length < 8 || senha.length > 72) problemas.push('A senha precisa ter entre 8 e 72 caracteres');
  else if (!TEM_LETRA.test(senha) || !TEM_NUMERO.test(senha)) problemas.push('A senha precisa ter letras e números');
  // Opcional: o dono escolhe se a pessoa nova é "funcionario" (o padrão) ou outro "dono".
  if (dados.papel !== undefined && dados.papel !== 'dono' && dados.papel !== 'funcionario') {
    problemas.push('O papel precisa ser "dono" ou "funcionario"');
  }

  if (problemas.length) throw new AppError(problemas.join('. '), 400);
  return { nome, email, senha, papel: dados.papel as Papel | undefined };
}

export function validarLogin(corpo: unknown): DadosLogin {
  const dados = (corpo ?? {}) as Record<string, unknown>;
  const email = normalizarEmail(dados.email);
  const senha = typeof dados.senha === 'string' ? dados.senha : '';

  if (!email || !senha) throw new AppError('Informe e-mail e senha', 400);
  return { email, senha };
}
