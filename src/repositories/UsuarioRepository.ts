import type { NovoUsuario, Usuario } from '../tipos/dominio';

// O "soquete" (DIP, seção 25): o service depende desta interface,
// e não do Knex. Assim dá para testar com um repositório de mentira
// e, se um dia trocar o Knex, o service não muda.
export interface UsuarioRepository {
  buscarPorEmail(email: string): Promise<Usuario | undefined>;
  buscarPorId(id: number): Promise<Usuario | undefined>;
  criar(dados: NovoUsuario): Promise<Usuario>;
  // Cria o usuário como dono SÓ se ainda não existir ninguém. Se já existir, devolve undefined.
  criarPrimeiroDono(dados: Omit<NovoUsuario, 'papel'>): Promise<Usuario | undefined>;
  listar(): Promise<Usuario[]>;
}
