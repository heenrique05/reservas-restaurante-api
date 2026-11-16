import request from 'supertest';
import app from './app';
import { Database } from './database/conexao';

// Teste de integração (seção 26): API + banco de verdade, juntos.
// Só roda se existir DATABASE_URL_TESTE, apontando para um banco SÓ de testes,
// porque ele apaga a tabela de usuários a cada teste.
const urlTeste = process.env.DATABASE_URL_TESTE;
const descrever = urlTeste ? describe : describe.skip;

descrever('Rotas de usuário (integração)', () => {
  beforeAll(() => {
    // A conexão só abre na primeira consulta, então dá tempo de trocar o endereço aqui.
    // As tabelas já foram criadas pelo src/testes/globalSetup.ts.
    process.env.DATABASE_URL = urlTeste;
    process.env.DATABASE_URL_POOLED = urlTeste;
  });

  beforeEach(async () => {
    await Database.conexao().raw('TRUNCATE usuarios RESTART IDENTITY');
  });

  afterAll(async () => {
    await Database.fechar();
  });

  const henrique = { nome: 'Henrique', email: 'henrique@teste.com', senha: 'senha123' };

  it('should sign up, log in and open the profile', async () => {
    const cadastro = await request(app).post('/usuarios').send(henrique);
    expect(cadastro.status).toBe(201);

    const login = await request(app).post('/tokens').send({ email: henrique.email, senha: henrique.senha });
    expect(login.status).toBe(200);

    const perfil = await request(app)
      .get('/usuarios/eu')
      .set('Authorization', `Bearer ${login.body.dados.token}`);

    expect(perfil.status).toBe(200);
    expect(perfil.body.dados).toEqual(expect.objectContaining({ email: henrique.email }));
    expect(perfil.body.dados).not.toHaveProperty('senhaHash');
  });

  it('should answer 409 for a repeated email', async () => {
    await request(app).post('/usuarios').send(henrique);

    const repetido = await request(app).post('/usuarios').send(henrique);

    expect(repetido.status).toBe(409);
  });

  it('should block the profile without a token', async () => {
    const resposta = await request(app).get('/usuarios/eu');

    expect(resposta.status).toBe(401);
  });
});
