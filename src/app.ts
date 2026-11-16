import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import homeRoutes from './routes/homeRoutes';
import { disponibilidadeRoutes } from './routes/disponibilidadeRoutes';
import { listaEsperaRoutes } from './routes/listaEsperaRoutes';
import { mesaRoutes } from './routes/mesaRoutes';
import { reservaRoutes } from './routes/reservaRoutes';
import { tokenRoutes, usuarioRoutes } from './routes/usuarioRoutes';
import { AppError } from './erros/AppError';
import { rotaNaoEncontrada, tratarErros } from './middlewares/tratarErros';

const origensPermitidas = (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean);

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origensPermitidas.includes(origin)) return callback(null, true);
      return callback(new AppError('Origem não permitida pelo CORS', 403));
    },
  }),
);
app.use(express.json());

app.use('/', homeRoutes);
app.use('/usuarios', usuarioRoutes);
app.use('/tokens', tokenRoutes);
app.use('/mesas', mesaRoutes);
app.use('/reservas', reservaRoutes);
app.use('/lista-espera', listaEsperaRoutes);
app.use('/disponibilidade', disponibilidadeRoutes);

// Esses dois ficam sempre por último.
app.use(rotaNaoEncontrada);
app.use(tratarErros);

export default app;
