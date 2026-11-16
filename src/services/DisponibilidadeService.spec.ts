import { horaEmBrasilia, horarioPermitido, horariosDoDia, PRIMEIRO_HORARIO, ULTIMO_HORARIO } from '../config/horarios';
import type { ReservaRepository } from '../repositories/ReservaRepository';
import { DisponibilidadeService, mesasLivresNoHorario } from './DisponibilidadeService';

const brasilia = (dataHora: string) => new Date(`${dataHora}-03:00`);

describe('horários do restaurante (11h à 1h, reservas de 2h30)', () => {
  it('should go from 11:00 to 22:30, every 30 minutes', () => {
    const horarios = horariosDoDia('2026-11-20').map(horaEmBrasilia);

    expect(PRIMEIRO_HORARIO).toBe('11:00');
    expect(ULTIMO_HORARIO).toBe('22:30');
    expect(horarios).toHaveLength(24);
    expect(horarios.slice(0, 3)).toEqual(['11:00', '11:30', '12:00']);
    expect(horarios.at(-1)).toBe('22:30');
  });

  it.each([
    ['2026-11-20T11:00:00', true],
    ['2026-11-20T19:30:00', true],
    ['2026-11-20T22:30:00', true], // termina 1h, na hora de fechar
    ['2026-11-20T23:00:00', false], // terminaria 1h30, depois de fechar
    ['2026-11-20T10:30:00', false], // antes de abrir
    ['2026-11-20T20:15:00', false], // fora dos 30 em 30
    ['2026-11-21T00:30:00', false], // madrugada
  ])('%s permitido? %s', (dataHora, esperado) => {
    expect(horarioPermitido(brasilia(dataHora))).toBe(esperado);
  });
});

describe('mesasLivresNoHorario (2h30 + 15 min de folga)', () => {
  // Mesa 1 ocupada das 20:00 às 22:30. Mesa 2 livre o dia todo.
  const ocupacao = {
    mesas: [1, 2],
    reservas: [{ mesaId: 1, inicio: brasilia('2026-11-20T20:00:00'), termino: brasilia('2026-11-20T22:30:00') }],
  };

  it.each([
    ['2026-11-20T17:00:00', 2], // termina 19:30; com a folga, 19:45: antes das 20h
    ['2026-11-20T17:30:00', 1], // termina 20:00, sem tempo de arrumar a mesa
    ['2026-11-20T20:00:00', 1],
    ['2026-11-20T22:30:00', 1], // a Maria acabou de sair, falta a folga
    ['2026-11-20T23:00:00', 2], // 22:30 + 15 min de folga: livre
  ])('%s -> %d mesa(s) livre(s)', (dataHora, livres) => {
    expect(mesasLivresNoHorario(ocupacao, brasilia(dataHora))).toBe(livres);
  });
});

describe('DisponibilidadeService', () => {
  it('should only show future times that still have a table', async () => {
    const ocupacao = {
      mesas: [1],
      reservas: [{ mesaId: 1, inicio: brasilia('2026-11-20T20:00:00'), termino: brasilia('2026-11-20T22:30:00') }],
    };
    const reservas = { ocupacao: jest.fn().mockResolvedValue(ocupacao) } as unknown as ReservaRepository;
    const agora = () => brasilia('2026-11-20T15:10:00');
    const sut = new DisponibilidadeService(reservas, agora);

    const livres = (await sut.horariosLivres('2026-11-20', 2)).map((h) => h.horario);

    expect(livres[0]).toBe('15:30'); // 15:00 já passou
    expect(livres).toContain('17:00');
    expect(livres).not.toContain('17:30'); // encostaria na reserva das 20h
    expect(livres).not.toContain('21:00');
    expect(livres.at(-1)).toBe('17:00'); // depois das 20h, a mesa só libera às 22:45, e o último horário é 22:30
  });
});
