import { validarCadastro, validarLogin } from './validadores';

describe('validarCadastro', () => {
  it('should clean the name and lowercase the email', () => {
    const dados = validarCadastro({ nome: '  Henrique  ', email: ' Henrique@Teste.COM ', senha: 'senha123' });

    expect(dados).toEqual({ nome: 'Henrique', email: 'henrique@teste.com', senha: 'senha123' });
  });

  it.each([
    ['nome curto', { nome: 'H', email: 'a@b.com', senha: 'senha123' }, 'nome'],
    ['e-mail sem @', { nome: 'Henrique', email: 'henrique.com', senha: 'senha123' }, 'E-mail inválido'],
    ['senha curta', { nome: 'Henrique', email: 'a@b.com', senha: 'abc1' }, 'entre 8 e 72'],
    ['senha sem número', { nome: 'Henrique', email: 'a@b.com', senha: 'somenteletras' }, 'letras e números'],
  ])('should reject %s', (_caso, corpo, mensagem) => {
    expect(() => validarCadastro(corpo)).toThrow(mensagem);
  });

  it('should list every problem at once', () => {
    expect(() => validarCadastro({})).toThrow(/nome.*E-mail.*senha/);
  });
});

describe('validarLogin', () => {
  it('should require email and password', () => {
    expect(() => validarLogin({ email: 'a@b.com' })).toThrow('Informe e-mail e senha');
  });
});
