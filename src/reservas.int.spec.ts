import request from 'supertest';
import app from './app';
import { gerarToken } from './auth/token';
import { reservaService } from './container';
import { Database } from './database/conexao';

// Teste de integração: mesas, reservas, lista de espera e horários com o banco de verdade.
// Só roda com DATABASE_URL_TESTE (um banco SÓ de testes: ele é apagado a cada teste).
const urlTeste = process.env.DATABASE_URL_TESTE;
const descrever = urlTeste ? describe : describe.skip;

// O login não consulta o banco, só confere o token. Então dá para criar o token direto.
const dono = `Bearer ${gerarToken({ id: 1, papel: 'dono' })}`;
const funcionario = `Bearer ${gerarToken({ id: 2, papel: 'funcionario' })}`;

// Sempre uma semana à frente, para o teste não "vencer" com o passar dos dias.
const dia = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
const as = (hora: string) => `${dia}T${hora}:00-03:00`;

let telefone = 11900000000;
const pedido = (pessoas: number, hora = '20:00', nomeCliente = 'Maria') => ({
  nomeCliente,
  telefone: String(telefone++), // cada pedido com um telefone diferente
  pessoas,
  dataHora: as(hora),
});

descrever('Mesas, reservas e lista de espera (integração)', () => {
  beforeAll(() => {
    process.env.DATABASE_URL = urlTeste;
    process.env.DATABASE_URL_POOLED = urlTeste;
  });

  beforeEach(async () => {
    await Database.conexao().raw('TRUNCATE lista_espera, reservas, mesas RESTART IDENTITY');
  });

  afterAll(async () => {
    await Database.fechar();
  });

  async function criarMesa(numero: number, lugares: number) {
    const resposta = await request(app).post('/mesas').set('Authorization', dono).send({ numero, lugares });
    expect(resposta.status).toBe(201);
    return resposta.body.dados;
  }

  const reservar = (corpo: object) => request(app).post('/reservas').send(corpo);
  const mudarStatus = (id: number, status: string) =>
    request(app).patch(`/reservas/${id}/status`).set('Authorization', funcionario).send({ status });
  // Simula o tempo passando: o prazo do sinal desta reserva já venceu.
  const vencerPrazo = (id: number) =>
    Database.conexao()('reservas').where({ id }).update({ expira_em: Database.conexao().raw("now() - interval '1 minute'") });

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

    const resposta = await reservar(pedido(3));

    expect(resposta.status).toBe(201);
    expect(resposta.body.dados.mesaId).toBe(mesa4.id);
    expect(resposta.body.mensagem).toContain('5 minutos');
  });

  it('should hold the table for 2h30 plus 15 minutes to set it up again', async () => {
    await criarMesa(1, 4);

    const primeira = await reservar(pedido(2, '18:00')); // 18:00 às 20:30, livre às 20:45
    const durante = await reservar(pedido(2, '19:00'));
    const semFolga = await reservar(pedido(2, '20:30'));
    const depois = await reservar(pedido(2, '21:00'));

    expect(primeira.status).toBe(201);
    expect(durante.status).toBe(409);
    expect(semFolga.status).toBe(409);
    expect(depois.status).toBe(201);
  });

  it('should refuse times outside 11:00 to 22:30', async () => {
    await criarMesa(1, 4);

    const tarde = await reservar(pedido(2, '23:00'));

    expect(tarde.status).toBe(400);
    expect(tarde.body.mensagem).toContain('entre 11:00 e 22:30');
  });

  it('should give the last table to only one of two simultaneous requests', async () => {
    await criarMesa(1, 4);

    // As duas chegam ao mesmo tempo. A transaction com FOR UPDATE faz uma esperar a outra.
    const respostas = await Promise.all([reservar(pedido(2)), reservar(pedido(2))]);

    expect(respostas.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it('should not use an inactive table', async () => {
    const mesa = await criarMesa(1, 4);
    await request(app).patch(`/mesas/${mesa.id}`).set('Authorization', dono).send({ ativa: false });

    const resposta = await reservar(pedido(2));

    expect(resposta.status).toBe(409);
  });

  it('should list the day with the table number (JOIN)', async () => {
    await criarMesa(7, 4);
    await reservar(pedido(2));

    const resposta = await request(app).get(`/reservas?data=${dia}`).set('Authorization', funcionario);

    expect(resposta.status).toBe(200);
    expect(resposta.body.dados).toHaveLength(1);
    expect(resposta.body.dados[0]).toEqual(expect.objectContaining({ mesaNumero: 7, nomeCliente: 'Maria' }));
  });

  describe('prazo do sinal', () => {
    it('should free the table as soon as the deadline passes, even before the sweep', async () => {
      await criarMesa(1, 4);
      const ana = await reservar(pedido(2));
      await vencerPrazo(ana.body.dados.id);

      const outra = await reservar(pedido(2));

      expect(outra.status).toBe(201);
    });

    it('should not confirm a reservation whose deadline passed', async () => {
      await criarMesa(1, 4);
      const ana = await reservar(pedido(2));
      await vencerPrazo(ana.body.dados.id);

      const confirmar = await mudarStatus(ana.body.dados.id, 'confirmada');

      expect(confirmar.status).toBe(409);
      expect(confirmar.body.mensagem).toContain('prazo');
    });

    it('should expire unpaid reservations and give the table to the line with 15 minutes to pay', async () => {
      await criarMesa(1, 4);
      const ana = await reservar(pedido(2, '20:00', 'Ana'));
      await request(app).post('/lista-espera').send(pedido(2, '20:00', 'Bia'));
      await vencerPrazo(ana.body.dados.id);

      const resultado = await reservaService.expirarVencidas();

      expect(resultado).toEqual({ expiradas: 1, atendidosDaFila: 1 });
      const reservas = await request(app).get(`/reservas?data=${dia}`).set('Authorization', funcionario);
      const daAna = reservas.body.dados.find((r: { nomeCliente: string }) => r.nomeCliente === 'Ana');
      const daBia = reservas.body.dados.find((r: { nomeCliente: string }) => r.nomeCliente === 'Bia');
      expect(daAna.status).toBe('expirada');
      expect(daBia.status).toBe('aguardando_sinal');
      const minutosParaPagar = (new Date(daBia.expiraEm).getTime() - Date.now()) / 60000;
      expect(minutosParaPagar).toBeGreaterThan(14);
      expect(minutosParaPagar).toBeLessThanOrEqual(15);
    });
  });

  describe('lista de espera', () => {
    it('should give the freed table to the first in line', async () => {
      await criarMesa(1, 4);
      const ana = await reservar(pedido(2, '20:00', 'Ana'));

      const lotado = await reservar(pedido(2, '20:00', 'Bia'));
      const bia = await request(app).post('/lista-espera').send(pedido(2, '20:00', 'Bia'));
      const caio = await request(app).post('/lista-espera').send(pedido(2, '20:00', 'Caio'));

      expect(lotado.status).toBe(409);
      expect(lotado.body.mensagem).toContain('lista de espera');
      expect(bia.body.dados.posicao).toBe(1);
      expect(caio.body.dados.posicao).toBe(2);

      const cancelamento = await mudarStatus(ana.body.dados.id, 'cancelada');
      expect(cancelamento.body.mensagem).toContain('1 cliente(s) da lista de espera');

      const fila = await request(app).get(`/lista-espera?data=${dia}`).set('Authorization', funcionario);
      const [entradaBia, entradaCaio] = fila.body.dados;
      expect(entradaBia).toEqual(expect.objectContaining({ nomeCliente: 'Bia', status: 'atendida' }));
      expect(entradaBia.reservaId).toBeDefined();
      expect(entradaCaio).toEqual(expect.objectContaining({ nomeCliente: 'Caio', status: 'aguardando' }));
    });

    it('should seat someone waiting for a time that touches the freed one', async () => {
      await criarMesa(1, 4);
      const ana = await reservar(pedido(2, '20:00')); // 20:00 às 22:30
      await request(app).post('/lista-espera').send(pedido(2, '21:00'));

      const cancelamento = await mudarStatus(ana.body.dados.id, 'cancelada');

      expect(cancelamento.body.mensagem).toContain('1 cliente(s)');
    });

    it('should not let anyone wait when a table is free', async () => {
      await criarMesa(1, 4);

      const resposta = await request(app).post('/lista-espera').send(pedido(2));

      expect(resposta.status).toBe(409);
    });

    it('should not seat the same person twice when two tables free at once', async () => {
      await criarMesa(1, 4);
      await criarMesa(2, 4);
      const ana = await reservar(pedido(2));
      const bia = await reservar(pedido(2));
      await request(app).post('/lista-espera').send(pedido(2, '20:00', 'Caio'));

      // Os dois cancelamentos chegam juntos. A fila é travada, e o Caio ganha UMA mesa.
      await Promise.all([mudarStatus(ana.body.dados.id, 'cancelada'), mudarStatus(bia.body.dados.id, 'cancelada')]);

      const reservas = await request(app).get(`/reservas?data=${dia}`).set('Authorization', funcionario);
      const doCaio = reservas.body.dados.filter((r: { nomeCliente: string }) => r.nomeCliente === 'Caio');
      expect(doCaio).toHaveLength(1);
    });
  });

  describe('relatório', () => {
    it('should group the period by status, day and time, only for the owner', async () => {
      await criarMesa(1, 4);
      await criarMesa(2, 4);
      const ana = await reservar(pedido(2, '20:00', 'Ana'));
      const bia = await reservar(pedido(4, '20:00', 'Bia'));
      const caio = await reservar(pedido(3, '12:00', 'Caio'));
      await mudarStatus(ana.body.dados.id, 'confirmada');
      await mudarStatus(ana.body.dados.id, 'concluida');
      await mudarStatus(bia.body.dados.id, 'confirmada');
      await mudarStatus(bia.body.dados.id, 'nao_compareceu');
      await mudarStatus(caio.body.dados.id, 'cancelada');

      const comoFuncionario = await request(app).get(`/relatorios?de=${dia}&ate=${dia}`).set('Authorization', funcionario);
      const resposta = await request(app).get(`/relatorios?de=${dia}&ate=${dia}`).set('Authorization', dono);

      expect(comoFuncionario.status).toBe(403);
      expect(resposta.status).toBe(200);
      const relatorio = resposta.body.dados;
      expect(relatorio.reservas).toEqual(expect.objectContaining({ total: 3, concluida: 1, nao_compareceu: 1, cancelada: 1 }));
      expect(relatorio.pessoasAtendidas).toBe(2);
      expect(relatorio.taxaDeFaltas).toBe(50);
      expect(relatorio.porDia).toEqual([{ dia, total: 3, concluidas: 1, canceladas: 1, faltas: 1, expiradas: 0 }]);
      expect(relatorio.horariosMaisProcurados[0]).toEqual({ horario: '20:00', reservas: 2 });
    });
  });

  describe('horários disponíveis', () => {
    it('should show the times that still have a table, counting the 15-minute margin', async () => {
      await criarMesa(1, 4);
      await reservar(pedido(2, '20:00')); // ocupa 20:00 às 22:30, livre às 22:45

      const resposta = await request(app).get(`/disponibilidade?data=${dia}&pessoas=2`);
      const horarios = resposta.body.dados.map((h: { horario: string }) => h.horario);

      expect(resposta.status).toBe(200);
      expect(horarios[0]).toBe('11:00');
      expect(horarios).toContain('17:00');
      expect(horarios).not.toContain('17:30');
      expect(horarios).not.toContain('20:00');
      expect(horarios).not.toContain('22:30');
    });

    it('should show nothing for a group bigger than every table', async () => {
      await criarMesa(1, 4);

      const resposta = await request(app).get(`/disponibilidade?data=${dia}&pessoas=6`);

      expect(resposta.body.dados).toEqual([]);
      expect(resposta.body.mensagem).toContain('lista de espera');
    });

    it('should ask how many people', async () => {
      const resposta = await request(app).get(`/disponibilidade?data=${dia}`);

      expect(resposta.status).toBe(400);
    });
  });
});
