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
  const ana = { nome: 'Ana Garçonete', email: 'ana@teste.com', senha: 'senha456' };

  async function loginComo(pessoa: { email: string; senha: string }) {
    const login = await request(app).post('/tokens').send({ email: pessoa.email, senha: pessoa.senha });
    return `Bearer ${login.body.dados.token}`;
  }

  it('should sign up the first owner, log in and open the profile', async () => {
    const cadastro = await request(app).post('/usuarios').send(henrique);
    expect(cadastro.status).toBe(201);
    expect(cadastro.body.dados.papel).toBe('dono');

    const perfil = await request(app).get('/usuarios/eu').set('Authorization', await loginComo(henrique));

    expect(perfil.status).toBe(200);
    expect(perfil.body.dados).toEqual(expect.objectContaining({ email: henrique.email }));
    expect(perfil.body.dados).not.toHaveProperty('senhaHash');
  });

  it('should not let a stranger sign up after the owner exists', async () => {
    await request(app).post('/usuarios').send(henrique);

    const estranho = await request(app).post('/usuarios').send(ana);

    expect(estranho.status).toBe(401);
  });

  it('should let the owner add staff, and staff cannot add anyone', async () => {
    await request(app).post('/usuarios').send(henrique);
    const comoDono = await loginComo(henrique);

    const cadastroAna = await request(app).post('/usuarios').set('Authorization', comoDono).send(ana);
    expect(cadastroAna.status).toBe(201);
    expect(cadastroAna.body.dados.papel).toBe('funcionario');

    const comoAna = await loginComo(ana);
    const tentativa = await request(app)
      .post('/usuarios')
      .set('Authorization', comoAna)
      .send({ nome: 'Outro', email: 'outro@teste.com', senha: 'senha789' });
    expect(tentativa.status).toBe(403);

    const equipeVistaPelaAna = await request(app).get('/usuarios').set('Authorization', comoAna);
    expect(equipeVistaPelaAna.status).toBe(403);

    const equipe = await request(app).get('/usuarios').set('Authorization', comoDono);
    expect(equipe.body.dados).toHaveLength(2);
  });

  it('should answer 409 for a repeated email', async () => {
    await request(app).post('/usuarios').send(henrique);
    const comoDono = await loginComo(henrique);

    const repetido = await request(app).post('/usuarios').set('Authorization', comoDono).send(henrique);

    expect(repetido.status).toBe(409);
  });

  it('should make only one owner when two first sign-ups arrive together', async () => {
    const respostas = await Promise.all([
      request(app).post('/usuarios').send(henrique),
      request(app).post('/usuarios').send(ana),
    ]);

    expect(respostas.map((r) => r.status).sort()).toEqual([201, 401]);
  });

  it('should refuse a broken token instead of ignoring it', async () => {
    const resposta = await request(app).post('/usuarios').set('Authorization', 'Bearer token-falso').send(henrique);

    expect(resposta.status).toBe(401);
  });

  it('should block the profile without a token', async () => {
    const resposta = await request(app).get('/usuarios/eu');

    expect(resposta.status).toBe(401);
  });
});
