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
    const usuario: Usuario = { id: this.usuarios.length + 1, papel: 'dono', criadoEm: new Date(), ...dados };
    this.usuarios.push(usuario);
    return usuario;
  }
}

const dados = { nome: 'Henrique', email: 'henrique@teste.com', senha: 'senha123' };

function criarSut() {
  const repositorio = new UsuarioRepositoryMock();
  const sut = new UsuarioService(repositorio);
  return { sut, repositorio };
}

describe('UsuarioService', () => {
  describe('cadastrar', () => {
    it('should create a user without returning the password', async () => {
      const { sut } = criarSut();

      const usuario = await sut.cadastrar(dados);

      expect(usuario).toEqual(expect.objectContaining({ id: 1, nome: 'Henrique', email: 'henrique@teste.com' }));
      expect(usuario).not.toHaveProperty('senhaHash');
    });

    it('should save a hash, never the plain password', async () => {
      const { sut, repositorio } = criarSut();

      await sut.cadastrar(dados);

      const salvo = repositorio.usuarios[0];
      expect(salvo.senhaHash).not.toBe('senha123');
      expect(salvo.senhaHash).toMatch(/^\$2[aby]\$/); // formato do bcrypt
    });

    it('should not accept a repeated email', async () => {
      const { sut } = criarSut();
      await sut.cadastrar(dados);

      await expect(sut.cadastrar(dados)).rejects.toMatchObject({ status: 409 });
    });

    it('should not call criar when the email exists', async () => {
      const { sut, repositorio } = criarSut();
      await sut.cadastrar(dados);
      const criarSpy = jest.spyOn(repositorio, 'criar');

      await expect(sut.cadastrar(dados)).rejects.toBeInstanceOf(AppError);
      expect(criarSpy).not.toHaveBeenCalled();
    });
  });

  describe('autenticar', () => {
    it('should return a valid token with the right password', async () => {
      const { sut } = criarSut();
      await sut.cadastrar(dados);

      const { token, usuario } = await sut.autenticar({ email: dados.email, senha: dados.senha });

      expect(verificarToken(token)).toEqual({ id: usuario.id, papel: 'dono' });
    });

    it('should give the same error for wrong password and unknown email', async () => {
      const { sut } = criarSut();
      await sut.cadastrar(dados);

      await expect(sut.autenticar({ email: dados.email, senha: 'errada123' })).rejects.toThrow(
        'E-mail ou senha inválidos',
      );
      await expect(sut.autenticar({ email: 'ninguem@teste.com', senha: dados.senha })).rejects.toThrow(
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
});
