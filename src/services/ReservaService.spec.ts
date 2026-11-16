import type { DadosParaReservar, ReservaRepository } from '../repositories/ReservaRepository';
import type { NovaReserva, Reserva, StatusReserva } from '../tipos/dominio';
import { ReservaService } from './ReservaService';

// Mock (seção 26): um repositório de mentira que só guarda num array.
// A escolha da mesa livre de verdade é testada no teste de integração, com o banco.
class ReservaRepositoryMock implements ReservaRepository {
  reservas: Reserva[] = [];
  temMesaLivre = true;
  vencidas: Reserva[] = [];

  async criarEmMesaLivre(dados: DadosParaReservar) {
    if (!this.temMesaLivre) return undefined;
    const reserva: Reserva = { id: this.reservas.length + 1, mesaId: 1, status: 'aguardando_sinal', criadoEm: new Date(), ...dados };
    this.reservas.push(reserva);
    return reserva;
  }
  async haMesaLivre() {
    return this.temMesaLivre;
  }
  async ocupacao() {
    return { mesas: [], reservas: [] };
  }
  async listarPorPeriodo() {
    return this.reservas.map((r) => ({ ...r, mesaNumero: 1 }));
  }
  async buscarPorId(id: number) {
    return this.reservas.find((r) => r.id === id);
  }
  async atualizarStatus(id: number, de: StatusReserva, para: StatusReserva) {
    const reserva = this.reservas.find((r) => r.id === id && r.status === de);
    if (reserva) reserva.status = para;
    return reserva;
  }
  async expirarVencidas() {
    return this.vencidas;
  }
}

const pedido: NovaReserva = {
  nomeCliente: 'Maria',
  telefone: '11987654321',
  pessoas: 4,
  dataHora: new Date('2026-11-20T20:00:00-03:00'),
};

const MINUTO = 60 * 1000;
const relogio = new Date('2026-11-16T15:00:00-03:00');

function criarSut(ouvintes: { mesaLiberada: jest.Mock }[] = [], agora = () => relogio) {
  const repositorio = new ReservaRepositoryMock();
  return { sut: new ReservaService(repositorio, ouvintes, agora), repositorio };
}

describe('ReservaService', () => {
  describe('reservar', () => {
    it('should block the table for 2h30', async () => {
      const { sut } = criarSut();

      const reserva = await sut.reservar(pedido);

      expect(reserva.termino.getTime() - reserva.dataHora.getTime()).toBe(150 * MINUTO);
      expect(reserva.status).toBe('aguardando_sinal');
    });

    it('should give 5 minutes to pay the deposit', async () => {
      const { sut } = criarSut();

      const reserva = await sut.reservar(pedido);

      expect(reserva.expiraEm!.getTime() - relogio.getTime()).toBe(5 * MINUTO);
    });

    it('should answer 409 and point to the waiting list when there is no free table', async () => {
      const { sut, repositorio } = criarSut();
      repositorio.temMesaLivre = false;

      await expect(sut.reservar(pedido)).rejects.toThrow('lista de espera');
    });
  });

  describe('mudarStatus', () => {
    it.each<[StatusReserva, StatusReserva]>([
      ['aguardando_sinal', 'confirmada'],
      ['aguardando_sinal', 'cancelada'],
      ['confirmada', 'concluida'],
      ['confirmada', 'nao_compareceu'],
    ])('should allow %s -> %s', async (de, para) => {
      const { sut, repositorio } = criarSut();
      const reserva = await sut.reservar(pedido);
      repositorio.reservas[0].status = de;

      const { reserva: atualizada } = await sut.mudarStatus(reserva.id, para);

      expect(atualizada.status).toBe(para);
    });

    it.each<[StatusReserva, StatusReserva]>([
      ['confirmada', 'aguardando_sinal'],
      ['cancelada', 'confirmada'],
      ['concluida', 'cancelada'],
      ['aguardando_sinal', 'concluida'],
      ['aguardando_sinal', 'expirada'], // só o sistema expira
      ['expirada', 'confirmada'],
    ])('should block %s -> %s', async (de, para) => {
      const { sut, repositorio } = criarSut();
      const reserva = await sut.reservar(pedido);
      repositorio.reservas[0].status = de;

      await expect(sut.mudarStatus(reserva.id, para)).rejects.toMatchObject({ status: 409 });
    });

    it('should not confirm after the deposit deadline, even before the sweep', async () => {
      let agora = relogio;
      const { sut } = criarSut([], () => agora);
      const reserva = await sut.reservar(pedido);
      agora = new Date(relogio.getTime() + 6 * MINUTO);

      await expect(sut.mudarStatus(reserva.id, 'confirmada')).rejects.toThrow('prazo para pagar o sinal acabou');
    });

    it('should answer 404 for a reservation that does not exist', async () => {
      const { sut } = criarSut();

      await expect(sut.mudarStatus(99, 'confirmada')).rejects.toMatchObject({ status: 404 });
    });

    it.each<StatusReserva>(['cancelada', 'nao_compareceu', 'concluida'])(
      'should tell the listeners when the table is freed (%s)',
      async (novo) => {
        const ouvinte = { mesaLiberada: jest.fn().mockResolvedValue(1) };
        const { sut, repositorio } = criarSut([ouvinte]);
        const reserva = await sut.reservar(pedido);
        if (novo !== 'cancelada') repositorio.reservas[0].status = 'confirmada';

        const { atendidosDaFila } = await sut.mudarStatus(reserva.id, novo);

        expect(ouvinte.mesaLiberada).toHaveBeenCalledWith(reserva.dataHora, reserva.termino);
        expect(atendidosDaFila).toBe(1);
      },
    );

    it('should not tell the listeners when a reservation is confirmed', async () => {
      const ouvinte = { mesaLiberada: jest.fn().mockResolvedValue(0) };
      const { sut } = criarSut([ouvinte]);
      const reserva = await sut.reservar(pedido);

      await sut.mudarStatus(reserva.id, 'confirmada');

      expect(ouvinte.mesaLiberada).not.toHaveBeenCalled();
    });

    it('should keep the cancellation even if a listener fails', async () => {
      const ouvinte = { mesaLiberada: jest.fn().mockRejectedValue(new Error('banco caiu')) };
      const { sut } = criarSut([ouvinte]);
      const reserva = await sut.reservar(pedido);
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const resultado = await sut.mudarStatus(reserva.id, 'cancelada');

      expect(resultado.reserva.status).toBe('cancelada');
      expect(resultado.atendidosDaFila).toBe(0);
    });

    it('should not save when someone changed the status first', async () => {
      const { sut, repositorio } = criarSut();
      const reserva = await sut.reservar(pedido);
      jest.spyOn(repositorio, 'atualizarStatus').mockResolvedValueOnce(undefined);

      await expect(sut.mudarStatus(reserva.id, 'confirmada')).rejects.toThrow('alterada por outra pessoa');
    });
  });

  describe('expirarVencidas', () => {
    it('should free each expired table for the waiting list', async () => {
      const ouvinte = { mesaLiberada: jest.fn().mockResolvedValue(1) };
      const { sut, repositorio } = criarSut([ouvinte]);
      const a = await sut.reservar(pedido);
      const b = await sut.reservar(pedido);
      repositorio.vencidas = [a, b];

      const resultado = await sut.expirarVencidas();

      expect(resultado).toEqual({ expiradas: 2, atendidosDaFila: 2 });
      expect(ouvinte.mesaLiberada).toHaveBeenCalledTimes(2);
    });
  });
});
