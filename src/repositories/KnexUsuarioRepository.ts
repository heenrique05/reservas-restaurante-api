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
// Um número qualquer que identifica a trava do primeiro cadastro.
const PRIMEIRO_DONO = 4242;

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
          papel: dados.papel ?? 'funcionario', // na dúvida, o papel com menos poder
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

  // O primeiro cadastro do sistema vira o dono. A trava (advisory lock) faz dois "primeiros"
  // cadastros simultâneos entrarem um de cada vez: o segundo já vê que existe alguém e não vira dono.
  async criarPrimeiroDono(dados: Omit<NovoUsuario, 'papel'>) {
    return Database.conexao().transaction(async (trx) => {
      await trx.raw('SELECT pg_advisory_xact_lock(?)', [PRIMEIRO_DONO]);
      const alguem = await trx('usuarios').first('id');
      if (alguem) return undefined;

      const [linha] = await trx<LinhaUsuario>('usuarios')
        .insert({ nome: dados.nome, email: dados.email, senha_hash: dados.senhaHash, papel: 'dono' })
        .returning('*');
      return paraUsuario(linha);
    });
  }

  async listar() {
    const linhas = await this.tabela.orderBy([{ column: 'papel' }, { column: 'nome' }]);
    return linhas.map(paraUsuario);
  }
}
