import { Database } from '../database/conexao';
import { Erros } from '../erros/AppError';
import type { EditarMesa, Mesa, NovaMesa } from '../tipos/dominio';
import type { MesaRepository } from './MesaRepository';

const COLUNAS: (keyof Mesa)[] = ['id', 'numero', 'lugares', 'ativa'];
const VIOLACAO_UNICA = '23505';

function traduzirErro(erro: unknown, numero?: number): never {
  if ((erro as { code?: string }).code === VIOLACAO_UNICA) {
    throw Erros.conflito(`Já existe uma mesa com o número ${numero ?? ''}`.trim());
  }
  throw erro;
}

export class KnexMesaRepository implements MesaRepository {
  private get tabela() {
    return Database.conexao()<Mesa>('mesas');
  }

  async listar() {
    return this.tabela.select<Mesa[]>(COLUNAS).orderBy('numero');
  }

  async buscarPorId(id: number): Promise<Mesa | undefined> {
    return this.tabela.select<Mesa[]>(COLUNAS).where({ id }).first();
  }

  async criar(dados: NovaMesa) {
    try {
      const [mesa] = await this.tabela.insert(dados).returning(COLUNAS);
      return mesa;
    } catch (erro) {
      return traduzirErro(erro, dados.numero);
    }
  }

  async atualizar(id: number, dados: EditarMesa) {
    try {
      const [mesa] = await this.tabela.where({ id }).update(dados).returning(COLUNAS);
      return mesa;
    } catch (erro) {
      return traduzirErro(erro, dados.numero);
    }
  }
}
