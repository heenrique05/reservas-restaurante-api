import { regras } from '../config/regras';
import { Erros } from '../erros/AppError';
import type { ListaEsperaRepository } from '../repositories/ListaEsperaRepository';
import type { ReservaRepository } from '../repositories/ReservaRepository';
import type { EntradaEspera, NovaReserva } from '../tipos/dominio';
import type { OuvinteMesaLiberada } from './ReservaService';

const DURACAO_MS = regras.duracaoReservaMin * 60 * 1000;

// Também é "ouvinte": o ReservaService avisa quando uma mesa libera,
// e a lista de espera tenta dar essa mesa para quem chegou primeiro (Observer, seção 28).
export class ListaEsperaService implements OuvinteMesaLiberada {
  constructor(
    private readonly lista: ListaEsperaRepository,
    private readonly reservas: ReservaRepository,
  ) {}

  async entrar(dados: NovaReserva): Promise<{ entrada: EntradaEspera; posicao: number }> {
    const termino = new Date(dados.dataHora.getTime() + DURACAO_MS);

    // Fila é para horário lotado. Tendo mesa, é só reservar.
    if (await this.reservas.haMesaLivre(dados.pessoas, dados.dataHora, termino)) {
      throw Erros.conflito('Ainda há mesa livre nesse horário: faça a reserva direto');
    }
    if (await this.lista.buscarAguardando(dados.telefone, dados.dataHora)) {
      throw Erros.conflito('Esse telefone já está na lista de espera para esse horário');
    }

    const entrada = await this.lista.criar(dados);
    return { entrada, posicao: await this.lista.posicao(entrada) };
  }

  listar(inicio: Date, fim: Date): Promise<EntradaEspera[]> {
    return this.lista.listarPorPeriodo(inicio, fim);
  }

  async cancelar(id: number): Promise<EntradaEspera> {
    const entrada = await this.lista.buscarPorId(id);
    if (!entrada) throw Erros.naoEncontrado('Entrada da lista de espera');

    const cancelada = await this.lista.cancelar(id);
    if (!cancelada) throw Erros.conflito('Só dá para cancelar quem ainda está aguardando');
    return cancelada;
  }

  mesaLiberada(inicio: Date, termino: Date): Promise<number> {
    return this.lista.promover(inicio, termino, DURACAO_MS);
  }
}
