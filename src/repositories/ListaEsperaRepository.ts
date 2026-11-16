import type { EntradaEspera, NovaReserva } from '../tipos/dominio';

export interface ListaEsperaRepository {
  criar(dados: NovaReserva): Promise<EntradaEspera>;
  buscarPorId(id: number): Promise<EntradaEspera | undefined>;
  // A pessoa já está aguardando esse mesmo horário?
  buscarAguardando(telefone: string, inicio: Date): Promise<EntradaEspera | undefined>;
  // 1 = primeira da fila para aquele horário.
  posicao(entrada: EntradaEspera): Promise<number>;
  listarPorPeriodo(inicio: Date, fim: Date): Promise<EntradaEspera[]>;
  cancelar(id: number): Promise<EntradaEspera | undefined>;
  // Uma mesa liberou de "inicio" a "termino": tenta dar mesa para quem espera, em ordem de chegada.
  // Devolve quantas pessoas da fila ganharam mesa.
  promover(inicio: Date, termino: Date, duracaoMs: number): Promise<number>;
}
