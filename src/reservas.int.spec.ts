import request from 'supertest';
import app from './app';
import { gerarToken } from './auth/token';
import { Database } from './database/conexao';

// Teste de integração: mesas e reservas com o banco de verdade.
// Só roda com DATABASE_URL_TESTE (um banco SÓ de testes: ele é apagado a cada teste).
const urlTeste = process.env.DATABASE_URL_TESTE;
const descrever = urlTeste ? describe : describe.skip;

// O login não consulta o banco, só confere o token. Então dá para criar o token direto.
const dono = `Bearer ${gerarToken({ id: 1, papel: 'dono' })}`;
const funcionario = `Bearer ${gerarToken({ id: 2, papel: 'funcionario' })}`;

const sexta20h = '2026-11-20T20:00:00-03:00';
const pedido = (pessoas: number, dataHora = sexta20h) => ({
  nomeCliente: 'Maria',
  telefone: '11987654321',
  pessoas,
  dataHora,
});

descrever('Mesas e reservas (integração)', () => {
  beforeAll(() => {
    process.env.DATABASE_URL = urlTeste;
    process.env.DATABASE_URL_POOLED = urlTeste;
  });

  beforeEach(async () => {
    await Database.conexao().raw('TRUNCATE reservas, mesas RESTART IDENTITY');
  });

  afterAll(async () => {
    await Database.fechar();
  });

  async function criarMesa(numero: number, lugares: number) {
    const resposta = await request(app).post('/mesas').set('Authorization', dono).send({ numero, lugares });
    expect(resposta.status).toBe(201);
    return resposta.body.dados;
  }

  it('should only let the owner create tables', async () => {
    const semLogin = await request(app).post('/mesas').send({ numero: 1, lugares: 2 });
    const comoFuncionario = await request(app).post('/mesas').set('Authorization', funcionario).send({ numero: 1, lugares: 2 });

    expect(semLogin.status).toBe(401);
    expect(comoFuncionario.status).toBe(403);
  });

  it('should pick the smallest free table that fits the group', async () => {
    await criarMesa(1, 2);
    const mesa4 = await criarMesa(2, 4);
    await criarMesa(3, 8);

    const resposta = await request(app).post('/reservas').send(pedido(3));

    expect(resposta.status).toBe(201);
    expect(resposta.body.dados.mesaId).toBe(mesa4.id);
  });

  it('should not book the same table twice at overlapping times', async () => {
    await criarMesa(1, 4);

    const primeira = await request(app).post('/reservas').send(pedido(2));
    const umaHoraDepois = await request(app).post('/reservas').send(pedido(2, '2026-11-20T21:00:00-03:00'));
    const quandoAcaba = await request(app).post('/reservas').send(pedido(2, '2026-11-20T22:00:00-03:00'));

    expect(primeira.status).toBe(201);
    expect(umaHoraDepois.status).toBe(409); // ainda ocupada
    expect(quandoAcaba.status).toBe(201); // às 22h a primeira já terminou
  });

  it('should free the table when a reservation is cancelled', async () => {
    await criarMesa(1, 4);
    const primeira = await request(app).post('/reservas').send(pedido(2));

    await request(app)
      .patch(`/reservas/${primeira.body.dados.id}/status`)
      .set('Authorization', funcionario)
      .send({ status: 'cancelada' });
    const depois = await request(app).post('/reservas').send(pedido(2));

    expect(depois.status).toBe(201);
  });

  it('should give the last table to only one of two simultaneous requests', async () => {
    await criarMesa(1, 4);

    // As duas chegam ao mesmo tempo. A transaction com FOR UPDATE faz uma esperar a outra.
    const respostas = await Promise.all([
      request(app).post('/reservas').send(pedido(2)),
      request(app).post('/reservas').send(pedido(2)),
    ]);

    expect(respostas.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it('should not use an inactive table', async () => {
    const mesa = await criarMesa(1, 4);
    await request(app).patch(`/mesas/${mesa.id}`).set('Authorization', dono).send({ ativa: false });

    const resposta = await request(app).post('/reservas').send(pedido(2));

    expect(resposta.status).toBe(409);
  });

  it('should list the day with the table number (JOIN)', async () => {
    await criarMesa(7, 4);
    await request(app).post('/reservas').send(pedido(2));
    await request(app).post('/reservas').send(pedido(2, '2026-11-21T20:00:00-03:00')); // outro dia

    const resposta = await request(app).get('/reservas?data=2026-11-20').set('Authorization', funcionario);

    expect(resposta.status).toBe(200);
    expect(resposta.body.dados).toHaveLength(1);
    expect(resposta.body.dados[0]).toEqual(expect.objectContaining({ mesaNumero: 7, nomeCliente: 'Maria' }));
  });
});
