import { Erros } from '../erros/AppError';
import type { MesaRepository } from '../repositories/MesaRepository';
import type { EditarMesa, Mesa, NovaMesa } from '../tipos/dominio';

export class MesaService {
  constructor(private readonly repositorio: MesaRepository) {}

  listar(): Promise<Mesa[]> {
    return this.repositorio.listar();
  }

  criar(dados: NovaMesa): Promise<Mesa> {
    return this.repositorio.criar(dados);
  }

  // Mesa não é apagada: é desativada ({ ativa: false }), para não perder o histórico de reservas.
  async atualizar(id: number, dados: EditarMesa): Promise<Mesa> {
    const mesa = await this.repositorio.atualizar(id, dados);
    if (!mesa) throw Erros.naoEncontrado('Mesa');
    return mesa;
  }
}
