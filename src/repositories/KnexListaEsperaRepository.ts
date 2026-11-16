import { Database } from '../database/conexao';
import type { EntradaEspera, NovaReserva, StatusEspera } from '../tipos/dominio';
import { reservarNaTransacao } from './KnexReservaRepository';
import type { ListaEsperaRepository } from './ListaEsperaRepository';

type LinhaEspera = {
  id: number;
  nome_cliente: string;
  telefone: string;
  email: string | null;
  pessoas: number;
  inicio: Date;
  observacao: string | null;
  status: StatusEspera;
  reserva_id: number | null;
  criado_em: Date;
};

function paraEntrada(l: LinhaEspera): EntradaEspera {
  return {
    id: l.id,
    nomeCliente: l.nome_cliente,
    telefone: l.telefone,
    email: l.email ?? undefined,
    pessoas: l.pessoas,
    dataHora: l.inicio,
    observacao: l.observacao ?? undefined,
    status: l.status,
    reservaId: l.reserva_id ?? undefined,
    criadoEm: l.criado_em,
  };
}

export class KnexListaEsperaRepository implements ListaEsperaRepository {
  private get db() {
    return Database.conexao();
  }

  async criar(dados: NovaReserva) {
    const [linha] = await this.db<LinhaEspera>('lista_espera')
      .insert({
        nome_cliente: dados.nomeCliente,
        telefone: dados.telefone,
        email: dados.email ?? null,
        pessoas: dados.pessoas,
        inicio: dados.dataHora,
        observacao: dados.observacao ?? null,
      })
      .returning('*');
    return paraEntrada(linha);
  }

  async buscarPorId(id: number) {
    const linha = await this.db<LinhaEspera>('lista_espera').where({ id }).first();
    return linha ? paraEntrada(linha) : undefined;
  }

  async buscarAguardando(telefone: string, inicio: Date) {
    const linha = await this.db<LinhaEspera>('lista_espera').where({ telefone, inicio, status: 'aguardando' }).first();
    return linha ? paraEntrada(linha) : undefined;
  }

  // Quantos estão aguardando o mesmo horário e chegaram antes (ou junto), contando a própria pessoa.
  async posicao(entrada: EntradaEspera) {
    const resultado = await this.db('lista_espera')
      .where({ inicio: entrada.dataHora, status: 'aguardando' })
      .andWhere('id', '<=', entrada.id)
      .count<{ total: string }[]>('id as total');
    return Number(resultado[0].total);
  }

  async listarPorPeriodo(inicio: Date, fim: Date) {
    const linhas = await this.db<LinhaEspera>('lista_espera')
      .where('inicio', '>=', inicio)
      .andWhere('inicio', '<', fim)
      .orderBy([{ column: 'inicio' }, { column: 'id' }]);
    return linhas.map(paraEntrada);
  }

  async cancelar(id: number) {
    const [linha] = await this.db<LinhaEspera>('lista_espera')
      .where({ id, status: 'aguardando' })
      .update({ status: 'cancelada' })
      .returning('*');
    return linha ? paraEntrada(linha) : undefined;
  }

  // Tudo numa transaction: travar a fila, dar as mesas e marcar quem foi atendido.
  // Se dois cancelamentos chegarem juntos, o segundo espera, e ninguém é atendido duas vezes.
  async promover(inicio: Date, termino: Date, duracaoMs: number) {
    return this.db.transaction(async (trx) => {
      // Quem quer um horário que se cruza com o que liberou, do mais antigo para o mais novo.
      const fila = await trx<LinhaEspera>('lista_espera')
        .where('status', 'aguardando')
        .andWhere('inicio', '<', termino)
        .andWhere('inicio', '>', new Date(inicio.getTime() - duracaoMs))
        .andWhere('inicio', '>', new Date()) // horário que já passou não conta
        .orderBy('id')
        .forUpdate();

      let atendidos = 0;
      for (const linha of fila) {
        const entrada = paraEntrada(linha);
        const reserva = await reservarNaTransacao(trx, {
          ...entrada,
          termino: new Date(entrada.dataHora.getTime() + duracaoMs),
        });
        if (reserva) {
          await trx('lista_espera').where({ id: entrada.id }).update({ status: 'atendida', reserva_id: reserva.id });
          atendidos++;
        }
      }
      return atendidos;
    });
  }
}
