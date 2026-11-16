import type { ReservaRepository } from '../repositories/ReservaRepository';
import type { NovaReserva, Reserva, StatusReserva } from '../tipos/dominio';
import { ReservaService } from './ReservaService';

// Mock (seção 26): um repositório de mentira que só guarda num array.
// A escolha da mesa livre de verdade é testada no teste de integração, com o banco.
class ReservaRepositoryMock implements ReservaRepository {
  reservas: Reserva[] = [];
  temMesaLivre = true;

  async criarEmMesaLivre(dados: NovaReserva & { termino: Date }) {
    if (!this.temMesaLivre) return undefined;
    const reserva: Reserva = { id: this.reservas.length + 1, mesaId: 1, status: 'aguardando_sinal', criadoEm: new Date(), ...dados };
    this.reservas.push(reserva);
    return reserva;
  }

  async haMesaLivre() {
    return this.temMesaLivre;
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
}

const pedido: NovaReserva = {
  nomeCliente: 'Maria',
  telefone: '11987654321',
  pessoas: 4,
  dataHora: new Date('2026-11-20T20:00:00-03:00'),
};

function criarSut() {
  const repositorio = new ReservaRepositoryMock();
  return { sut: new ReservaService(repositorio), repositorio };
}

describe('ReservaService', () => {
  describe('reservar', () => {
    it('should block the table for 2 hours', async () => {
      const { sut } = criarSut();

      const reserva = await sut.reservar(pedido);

      expect(reserva.termino.getTime() - reserva.dataHora.getTime()).toBe(2 * 60 * 60 * 1000);
      expect(reserva.status).toBe('aguardando_sinal');
    });

    it('should answer 409 when there is no free table', async () => {
      const { sut, repositorio } = criarSut();
      repositorio.temMesaLivre = false;

      await expect(sut.reservar(pedido)).rejects.toMatchObject({ status: 409 });
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
    ])('should block %s -> %s', async (de, para) => {
      const { sut, repositorio } = criarSut();
      const reserva = await sut.reservar(pedido);
      repositorio.reservas[0].status = de;

      await expect(sut.mudarStatus(reserva.id, para)).rejects.toMatchObject({ status: 409 });
    });

    it('should answer 404 for a reservation that does not exist', async () => {
      const { sut } = criarSut();

      await expect(sut.mudarStatus(99, 'confirmada')).rejects.toMatchObject({ status: 404 });
    });

    it('should tell the listeners when a reservation is cancelled', async () => {
      const ouvinte = { mesaLiberada: jest.fn().mockResolvedValue(1) };
      const sut = new ReservaService(new ReservaRepositoryMock(), [ouvinte]);
      const reserva = await sut.reservar(pedido);

      const { atendidosDaFila } = await sut.mudarStatus(reserva.id, 'cancelada');

      expect(ouvinte.mesaLiberada).toHaveBeenCalledWith(reserva.dataHora, reserva.termino);
      expect(atendidosDaFila).toBe(1);
    });

    it('should not tell the listeners when a reservation is confirmed', async () => {
      const ouvinte = { mesaLiberada: jest.fn().mockResolvedValue(0) };
      const sut = new ReservaService(new ReservaRepositoryMock(), [ouvinte]);
      const reserva = await sut.reservar(pedido);

      await sut.mudarStatus(reserva.id, 'confirmada');

      expect(ouvinte.mesaLiberada).not.toHaveBeenCalled();
    });

    it('should keep the cancellation even if a listener fails', async () => {
      const ouvinte = { mesaLiberada: jest.fn().mockRejectedValue(new Error('banco caiu')) };
      const sut = new ReservaService(new ReservaRepositoryMock(), [ouvinte]);
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
});
