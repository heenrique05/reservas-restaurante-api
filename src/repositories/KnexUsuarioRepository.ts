import { Database } from '../database/conexao';
import { Erros } from '../erros/AppError';
import type { NovoUsuario, Usuario } from '../tipos/dominio';
import type { UsuarioRepository } from './UsuarioRepository';

// Como a linha vem do banco (snake_case).
type LinhaUsuario = {
  id: number;
  nome: string;
  email: string;
  senha_hash: string;
  papel: Usuario['papel'];
  criado_em: Date;
};

function paraUsuario(linha: LinhaUsuario): Usuario {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    senhaHash: linha.senha_hash,
    papel: linha.papel,
    criadoEm: linha.criado_em,
  };
}

// Código de erro do PostgreSQL para "valor repetido em coluna única".
const VIOLACAO_UNICA = '23505';

export class KnexUsuarioRepository implements UsuarioRepository {
  private get tabela() {
    return Database.conexao()<LinhaUsuario>('usuarios');
  }

  async buscarPorEmail(email: string) {
    const linha = await this.tabela.where({ email }).first();
    return linha ? paraUsuario(linha) : undefined;
  }

  async buscarPorId(id: number) {
    const linha = await this.tabela.where({ id }).first();
    return linha ? paraUsuario(linha) : undefined;
  }

  async criar(dados: NovoUsuario) {
    try {
      const [linha] = await this.tabela
        .insert({
          nome: dados.nome,
          email: dados.email,
          senha_hash: dados.senhaHash,
          papel: dados.papel ?? 'dono',
        })
        .returning('*');
      return paraUsuario(linha);
    } catch (erro) {
      // Dois cadastros com o mesmo e-mail no mesmo instante: o banco barra.
      if ((erro as { code?: string }).code === VIOLACAO_UNICA) {
        throw Erros.conflito('Este e-mail já está cadastrado');
      }
      throw erro;
    }
  }
}
