import type { ListaEsperaRepository } from '../repositories/ListaEsperaRepository';
import type { ReservaRepository } from '../repositories/ReservaRepository';
import type { EntradaEspera, NovaReserva } from '../tipos/dominio';
import { ListaEsperaService } from './ListaEsperaService';

// Mocks (seção 26): só o que o service usa. A fila de verdade é testada na integração.
class ListaMock implements ListaEsperaRepository {
  entradas: EntradaEspera[] = [];
  promover = jest.fn().mockResolvedValue(0);

  async criar(dados: NovaReserva) {
    const entrada: EntradaEspera = { ...dados, id: this.entradas.length + 1, status: 'aguardando', criadoEm: new Date() };
    this.entradas.push(entrada);
    return entrada;
  }
  async buscarPorId(id: number) {
    return this.entradas.find((e) => e.id === id);
  }
  async buscarAguardando(telefone: string, inicio: Date) {
    return this.entradas.find(
      (e) => e.telefone === telefone && e.dataHora.getTime() === inicio.getTime() && e.status === 'aguardando',
    );
  }
  async posicao(entrada: EntradaEspera) {
    return this.entradas.filter((e) => e.status === 'aguardando' && e.id <= entrada.id).length;
  }
  async listarPorPeriodo() {
    return this.entradas;
  }
  async cancelar(id: number) {
    const entrada = this.entradas.find((e) => e.id === id && e.status === 'aguardando');
    if (entrada) entrada.status = 'cancelada';
    return entrada;
  }
}

function criarSut(haMesaLivre = false) {
  const lista = new ListaMock();
  const reservas = { haMesaLivre: jest.fn().mockResolvedValue(haMesaLivre) } as unknown as ReservaRepository;
  return { sut: new ListaEsperaService(lista, reservas), lista };
}

const pedido = (telefone = '11987654321'): NovaReserva => ({
  nomeCliente: 'Maria',
  telefone,
  pessoas: 4,
  dataHora: new Date('2026-11-20T20:00:00-03:00'),
});

describe('ListaEsperaService', () => {
  it('should put people in line in order of arrival', async () => {
    const { sut } = criarSut();

    const primeira = await sut.entrar(pedido('11911111111'));
    const segunda = await sut.entrar(pedido('11922222222'));

    expect(primeira.posicao).toBe(1);
    expect(segunda.posicao).toBe(2);
  });

  it('should not let someone wait when there is a free table', async () => {
    const { sut } = criarSut(true);

    await expect(sut.entrar(pedido())).rejects.toThrow('faça a reserva direto');
  });

  it('should not put the same phone twice for the same time', async () => {
    const { sut } = criarSut();
    await sut.entrar(pedido());

    await expect(sut.entrar(pedido())).rejects.toMatchObject({ status: 409 });
  });

  it('should only cancel someone who is still waiting', async () => {
    const { sut } = criarSut();
    const { entrada } = await sut.entrar(pedido());

    await sut.cancelar(entrada.id);

    await expect(sut.cancelar(entrada.id)).rejects.toMatchObject({ status: 409 });
    await expect(sut.cancelar(99)).rejects.toMatchObject({ status: 404 });
  });

  it('should try to seat the line when a table is freed, using the 2-hour slot', async () => {
    const { sut, lista } = criarSut();
    const inicio = new Date('2026-11-20T23:00:00Z');
    const termino = new Date('2026-11-21T01:00:00Z');

    await sut.mesaLiberada(inicio, termino);

    expect(lista.promover).toHaveBeenCalledWith(inicio, termino, 2 * 60 * 60 * 1000);
  });
});
