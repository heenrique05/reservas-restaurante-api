import { validarDia, validarNovaReserva, validarStatus } from './reservas';
import { validarEdicaoMesa, validarNovaMesa } from './mesas';

const agora = new Date('2026-11-16T15:00:00-03:00');
const valido = { nomeCliente: 'Maria', telefone: '(11) 98765-4321', pessoas: 4, dataHora: '2026-11-20T20:00:00-03:00' };

describe('validarNovaReserva', () => {
  it('should clean the phone and read the date with its time zone', () => {
    const dados = validarNovaReserva(valido, agora);

    expect(dados.telefone).toBe('11987654321');
    expect(dados.dataHora.toISOString()).toBe('2026-11-20T23:00:00.000Z');
    expect(dados.email).toBeUndefined();
  });

  it.each([
    ['phone without area code', { ...valido, telefone: '98765-4321' }, 'Telefone inválido'],
    ['date without time zone', { ...valido, dataHora: '2026-11-20T20:00:00' }, 'Data e hora inválidas'],
    ['date in the past', { ...valido, dataHora: '2026-11-10T20:00:00-03:00' }, 'horário futuro'],
    ['date too far ahead', { ...valido, dataHora: '2027-06-01T20:00:00-03:00' }, '60 dias'],
    ['zero people', { ...valido, pessoas: 0 }, 'número de pessoas'],
    ['too many people', { ...valido, pessoas: 50 }, 'número de pessoas'],
    ['bad email', { ...valido, email: 'maria.com' }, 'E-mail inválido'],
  ])('should reject %s', (_caso, corpo, mensagem) => {
    expect(() => validarNovaReserva(corpo, agora)).toThrow(mensagem);
  });
});

describe('validarStatus', () => {
  it('should accept a known status', () => {
    expect(validarStatus({ status: 'confirmada' })).toBe('confirmada');
  });

  it.each(['xyz', 'toString', 42, undefined])('should reject %p', (status) => {
    expect(() => validarStatus({ status })).toThrow('Status inválido');
  });
});

describe('validarDia', () => {
  it('should cover the whole day in Brasília time', () => {
    const { inicio, fim } = validarDia('2026-11-20');

    expect(inicio.toISOString()).toBe('2026-11-20T03:00:00.000Z');
    expect(fim.toISOString()).toBe('2026-11-21T03:00:00.000Z');
  });

  it('should use today when no date comes', () => {
    expect(validarDia(undefined, agora).dia).toBe('2026-11-16');
  });

  it('should reject a date in another format', () => {
    expect(() => validarDia('20/11/2026')).toThrow('Data inválida');
  });
});

describe('validação de mesas', () => {
  it('should create an active table by default', () => {
    expect(validarNovaMesa({ numero: 5, lugares: 4 })).toEqual({ numero: 5, lugares: 4, ativa: true });
  });

  it('should reject a table without seats', () => {
    expect(() => validarNovaMesa({ numero: 5, lugares: 0 })).toThrow('lugares');
  });

  it('should require at least one field to edit', () => {
    expect(() => validarEdicaoMesa({})).toThrow('Envie numero, lugares ou ativa');
  });
});

describe('horário de funcionamento na reserva', () => {
  it.each([
    ['before opening', '2026-11-20T10:00:00-03:00'],
    ['too late to fit 2h30 before closing', '2026-11-20T23:00:00-03:00'],
    ['not on the 30-minute grid', '2026-11-20T20:15:00-03:00'],
  ])('should reject a time %s', (_caso, dataHora) => {
    expect(() => validarNovaReserva({ ...valido, dataHora }, agora)).toThrow('entre 11:00 e 22:30');
  });

  it('should accept the last time of the day', () => {
    expect(() => validarNovaReserva({ ...valido, dataHora: '2026-11-20T22:30:00-03:00' }, agora)).not.toThrow();
  });
});
