import { verificarToken } from '../auth/token';
import { AppError } from '../erros/AppError';
import type { UsuarioRepository } from '../repositories/UsuarioRepository';
import type { NovoUsuario, Usuario } from '../tipos/dominio';
import { UsuarioService } from './UsuarioService';

// Mock (seção 26): um repositório de mentira, guardando tudo num array.
// O service nem percebe, porque só conhece a interface (DIP).
class UsuarioRepositoryMock implements UsuarioRepository {
  usuarios: Usuario[] = [];

  async buscarPorEmail(email: string) {
    return this.usuarios.find((u) => u.email === email);
  }

  async buscarPorId(id: number) {
    return this.usuarios.find((u) => u.id === id);
  }

  async criar(dados: NovoUsuario) {
    const usuario: Usuario = { id: this.usuarios.length + 1, papel: 'funcionario', criadoEm: new Date(), ...dados };
    this.usuarios.push(usuario);
    return usuario;
  }

  async criarPrimeiroDono(dados: Omit<NovoUsuario, 'papel'>) {
    if (this.usuarios.length > 0) return undefined;
    return this.criar({ ...dados, papel: 'dono' });
  }

  async listar() {
    return this.usuarios;
  }
}

const dono = { nome: 'Henrique', email: 'henrique@teste.com', senha: 'senha123' };
const ana = { nome: 'Ana Garçonete', email: 'ana@teste.com', senha: 'senha456' };
const comoDono = { papel: 'dono' as const };

function criarSut() {
  const repositorio = new UsuarioRepositoryMock();
  const sut = new UsuarioService(repositorio);
  return { sut, repositorio };
}

describe('UsuarioService', () => {
  describe('cadastrar', () => {
    it('should make the very first user the owner, without login', async () => {
      const { sut } = criarSut();

      const usuario = await sut.cadastrar(dono);

      expect(usuario).toEqual(expect.objectContaining({ id: 1, nome: 'Henrique', papel: 'dono' }));
      expect(usuario).not.toHaveProperty('senhaHash');
    });

    it('should refuse a sign-up without login once someone exists', async () => {
      const { sut } = criarSut();
      await sut.cadastrar(dono);

      await expect(sut.cadastrar(ana)).rejects.toMatchObject({ status: 401 });
    });

    it('should let the owner add staff, as "funcionario" by default', async () => {
      const { sut } = criarSut();
      await sut.cadastrar(dono);

      const funcionaria = await sut.cadastrar(ana, comoDono);

      expect(funcionaria.papel).toBe('funcionario');
    });

    it('should let the owner add another owner when asked', async () => {
      const { sut } = criarSut();
      await sut.cadastrar(dono);

      const socio = await sut.cadastrar({ ...ana, papel: 'dono' }, comoDono);

      expect(socio.papel).toBe('dono');
    });

    it('should not let staff add anyone', async () => {
      const { sut } = criarSut();
      await sut.cadastrar(dono);

      await expect(sut.cadastrar(ana, { papel: 'funcionario' })).rejects.toMatchObject({ status: 403 });
    });

    it('should save a hash, never the plain password', async () => {
      const { sut, repositorio } = criarSut();

      await sut.cadastrar(dono);

      const salvo = repositorio.usuarios[0];
      expect(salvo.senhaHash).not.toBe('senha123');
      expect(salvo.senhaHash).toMatch(/^\$2[aby]\$/); // formato do bcrypt
    });

    it('should not accept a repeated email, and not call criar', async () => {
      const { sut, repositorio } = criarSut();
      await sut.cadastrar(dono);
      await sut.cadastrar(ana, comoDono);
      const criarSpy = jest.spyOn(repositorio, 'criar');

      await expect(sut.cadastrar(ana, comoDono)).rejects.toMatchObject({ status: 409 });
      await expect(sut.cadastrar(ana, comoDono)).rejects.toBeInstanceOf(AppError);
      expect(criarSpy).not.toHaveBeenCalled();
    });
  });

  describe('autenticar', () => {
    it('should return a valid token with the right password', async () => {
      const { sut } = criarSut();
      await sut.cadastrar(dono);

      const { token, usuario } = await sut.autenticar({ email: dono.email, senha: dono.senha });

      expect(verificarToken(token)).toEqual({ id: usuario.id, papel: 'dono' });
    });

    it('should give the same error for wrong password and unknown email', async () => {
      const { sut } = criarSut();
      await sut.cadastrar(dono);

      await expect(sut.autenticar({ email: dono.email, senha: 'errada123' })).rejects.toThrow(
        'E-mail ou senha inválidos',
      );
      await expect(sut.autenticar({ email: 'ninguem@teste.com', senha: dono.senha })).rejects.toThrow(
        'E-mail ou senha inválidos',
      );
    });
  });

  describe('buscarPerfil', () => {
    it('should return 404 for a user that does not exist', async () => {
      const { sut } = criarSut();

      await expect(sut.buscarPerfil(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('listarEquipe', () => {
    it('should list everyone without passwords', async () => {
      const { sut } = criarSut();
      await sut.cadastrar(dono);
      await sut.cadastrar(ana, comoDono);

      const equipe = await sut.listarEquipe();

      expect(equipe).toHaveLength(2);
      equipe.forEach((pessoa) => expect(pessoa).not.toHaveProperty('senhaHash'));
    });
  });
});
