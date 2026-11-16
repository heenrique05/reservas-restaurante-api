import type { EditarMesa, Mesa, NovaMesa } from '../tipos/dominio';

export interface MesaRepository {
  listar(): Promise<Mesa[]>;
  buscarPorId(id: number): Promise<Mesa | undefined>;
  criar(dados: NovaMesa): Promise<Mesa>;
  atualizar(id: number, dados: EditarMesa): Promise<Mesa | undefined>;
}
