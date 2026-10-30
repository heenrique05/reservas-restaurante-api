// Erro "esperado" da API, com o status HTTP certo.
// Seção 20: classe, herança (extends Error), super e readonly.

export class AppError extends Error {
  constructor(
    mensagem: string,
    public readonly status: number = 400,
  ) {
    super(mensagem);
    this.name = 'AppError';
  }
}

// Atalhos pros erros mais comuns.
// Seção 20: static, pertence à classe e não a cada objeto.
export class Erros {
  static naoEncontrado(oQue: string) {
    return new AppError(`${oQue} não encontrado(a)`, 404);
  }

  static naoAutorizado() {
    return new AppError('Faça login para continuar', 401);
  }

  static semPermissao() {
    return new AppError('Você não tem permissão para isso', 403);
  }

  static conflito(mensagem: string) {
    return new AppError(mensagem, 409);
  }
}
