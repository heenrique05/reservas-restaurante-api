import { KnexListaEsperaRepository } from './repositories/KnexListaEsperaRepository';
import { KnexMesaRepository } from './repositories/KnexMesaRepository';
import { KnexRelatorioRepository } from './repositories/KnexRelatorioRepository';
import { KnexReservaRepository } from './repositories/KnexReservaRepository';
import { KnexUsuarioRepository } from './repositories/KnexUsuarioRepository';
import { DisponibilidadeService } from './services/DisponibilidadeService';
import { ListaEsperaService } from './services/ListaEsperaService';
import { MesaService } from './services/MesaService';
import { RelatorioService } from './services/RelatorioService';
import { ReservaService } from './services/ReservaService';
import { UsuarioService } from './services/UsuarioService';

// Onde as peças são montadas e encaixadas, num lugar só.
// Cada service recebe os repositórios de que precisa (inversão de dependência, seção 25).
const reservaRepository = new KnexReservaRepository();

export const usuarioService = new UsuarioService(new KnexUsuarioRepository());
export const mesaService = new MesaService(new KnexMesaRepository());
export const listaEsperaService = new ListaEsperaService(new KnexListaEsperaRepository(), reservaRepository);
// A lista de espera "ouve" os cancelamentos de reserva.
export const reservaService = new ReservaService(reservaRepository, [listaEsperaService]);
export const disponibilidadeService = new DisponibilidadeService(reservaRepository);
export const relatorioService = new RelatorioService(new KnexRelatorioRepository());
