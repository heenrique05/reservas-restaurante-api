import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import homeRoutes from './routes/homeRoutes';

const origensPermitidas = (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean);

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origensPermitidas.includes(origin)) return callback(null, true);
      return callback(new Error('Origem não permitida pelo CORS'));
    },
  }),
);
app.use(express.json());

app.use('/', homeRoutes);

export default app;
