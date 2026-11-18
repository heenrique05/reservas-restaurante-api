import type { RelatorioRepository } from '../repositories/RelatorioRepository';
import { validarPeriodo } from '../validacao/relatorios';
import { RelatorioService } from './RelatorioService';

// O banco já devolve as linhas agrupadas; aqui só testamos as contas em cima delas.
function criarSut() {
  const repositorio: RelatorioRepository = {
    reservasPorDiaEStatus: jest.fn().mockResolvedValue([
      { dia: '2026-11-20', status: 'concluida', reservas: 3, pessoas: 10 },
      { dia: '2026-11-20', status: 'nao_compareceu', reservas: 1, pessoas: 2 },
      { dia: '2026-11-20', status: 'expirada', reservas: 2, pessoas: 4 },
      { dia: '2026-11-21', status: 'cancelada', reservas: 1, pessoas: 2 },
      { dia: '2026-11-21', status: 'concluida', reservas: 1, pessoas: 6 },
    ]),
    horariosMaisProcurados: jest.fn().mockResolvedValue([{ horario: '20:00', reservas: 5 }]),
    listaEsperaPorStatus: jest.fn().mockResolvedValue([
      { status: 'atendida', total: 2 },
      { status: 'aguardando', total: 1 },
    ]),
  };
  return new RelatorioService(repositorio);
}

const periodo = validarPeriodo('2026-11-01', '2026-11-30');

describe('RelatorioService', () => {
  it('should add up every status, showing zero for those that did not happen', async () => {
    const relatorio = await criarSut().gerar(periodo);

    expect(relatorio.reservas).toEqual({
      total: 8,
      aguardando_sinal: 0,
      confirmada: 0,
      cancelada: 1,
      concluida: 4,
      nao_compareceu: 1,
      expirada: 2,
    });
  });

  it('should count only the people who actually came', async () => {
    const relatorio = await criarSut().gerar(periodo);

    expect(relatorio.pessoasAtendidas).toBe(16); // 10 + 6
  });

  it('should calculate the no-show and expiration rates', async () => {
    const relatorio = await criarSut().gerar(periodo);

    expect(relatorio.taxaDeFaltas).toBe(20); // 1 falta em 5 que tinham mesa garantida
    expect(relatorio.taxaDeExpiracao).toBe(25); // 2 de 8
  });

  it('should summarize each day', async () => {
    const relatorio = await criarSut().gerar(periodo);

    expect(relatorio.porDia).toEqual([
      { dia: '2026-11-20', total: 6, concluidas: 3, canceladas: 0, faltas: 1, expiradas: 2 },
      { dia: '2026-11-21', total: 2, concluidas: 1, canceladas: 1, faltas: 0, expiradas: 0 },
    ]);
  });

  it('should summarize the waiting list', async () => {
    const relatorio = await criarSut().gerar(periodo);

    expect(relatorio.listaEspera).toEqual({ total: 3, aguardando: 1, atendida: 2, cancelada: 0 });
  });

  it('should not invent a rate when there is nothing to divide', async () => {
    const vazio: RelatorioRepository = {
      reservasPorDiaEStatus: jest.fn().mockResolvedValue([]),
      horariosMaisProcurados: jest.fn().mockResolvedValue([]),
      listaEsperaPorStatus: jest.fn().mockResolvedValue([]),
    };

    const relatorio = await new RelatorioService(vazio).gerar(periodo);

    expect(relatorio.taxaDeFaltas).toBeNull();
    expect(relatorio.taxaDeExpiracao).toBeNull();
  });
});

describe('validarPeriodo', () => {
  it('should include the whole last day, in Brasília time', () => {
    const { inicio, fim } = validarPeriodo('2026-11-01', '2026-11-30');

    expect(inicio.toISOString()).toBe('2026-11-01T03:00:00.000Z');
    expect(fim.toISOString()).toBe('2026-12-01T03:00:00.000Z');
  });

  it('should use the current month when no dates come', () => {
    const agora = new Date('2026-02-10T12:00:00-03:00');

    expect(validarPeriodo(undefined, undefined, agora)).toEqual(expect.objectContaining({ de: '2026-02-01', ate: '2026-02-28' }));
  });

  it.each([
    ['dates out of order', '2026-11-30', '2026-11-01', 'antes'],
    ['a wrong format', '01/11/2026', '30/11/2026', 'Datas inválidas'],
    ['more than a year', '2025-01-01', '2026-12-31', 'no máximo 366 dias'],
  ])('should reject %s', (_caso, de, ate, mensagem) => {
    expect(() => validarPeriodo(de, ate)).toThrow(mensagem);
  });
});
