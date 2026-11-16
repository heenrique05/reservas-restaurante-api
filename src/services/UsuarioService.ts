import bcrypt from 'bcryptjs';
import { gerarToken } from '../auth/token';
import { AppError, Erros } from '../erros/AppError';
import type { UsuarioRepository } from '../repositories/UsuarioRepository';
import type { Usuario, UsuarioPublico } from '../tipos/dominio';
import type { DadosCadastro, DadosLogin } from '../validacao/validadores';

const RODADAS_BCRYPT = 10;

// Tira a senha antes de qualquer resposta. O tipo avisa, mas quem tira de verdade é esta função.
export function semSenha({ senhaHash: _senhaHash, ...publico }: Usuario): UsuarioPublico {
  return publico;
}

// As regras de cadastro e login. Não sabe nada de Express nem de Knex (SRP e DIP, seção 25).
export class UsuarioService {
  constructor(private readonly repositorio: UsuarioRepository) {}

  async cadastrar(dados: DadosCadastro): Promise<UsuarioPublico> {
    const existente = await this.repositorio.buscarPorEmail(dados.email);
    if (existente) throw Erros.conflito('Este e-mail já está cadastrado');

    const senhaHash = await bcrypt.hash(dados.senha, RODADAS_BCRYPT);
    const usuario = await this.repositorio.criar({ nome: dados.nome, email: dados.email, senhaHash });
    return semSenha(usuario);
  }

  async autenticar(dados: DadosLogin): Promise<{ token: string; usuario: UsuarioPublico }> {
    const usuario = await this.repositorio.buscarPorEmail(dados.email);
    const senhaConfere = usuario ? await bcrypt.compare(dados.senha, usuario.senhaHash) : false;

    // Mesma mensagem nos dois casos, para ninguém descobrir quais e-mails têm cadastro.
    if (!usuario || !senhaConfere) throw new AppError('E-mail ou senha inválidos', 401);

    const token = gerarToken({ id: usuario.id, papel: usuario.papel });
    return { token, usuario: semSenha(usuario) };
  }

  async buscarPerfil(id: number): Promise<UsuarioPublico> {
    const usuario = await this.repositorio.buscarPorId(id);
    if (!usuario) throw Erros.naoEncontrado('Usuário');
    return semSenha(usuario);
  }
}
