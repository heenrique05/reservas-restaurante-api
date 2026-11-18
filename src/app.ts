import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { openapi } from './docs/openapi';
import homeRoutes from './routes/homeRoutes';
import { disponibilidadeRoutes } from './routes/disponibilidadeRoutes';
import { listaEsperaRoutes } from './routes/listaEsperaRoutes';
import { mesaRoutes } from './routes/mesaRoutes';
import { relatorioRoutes } from './routes/relatorioRoutes';
import { reservaRoutes } from './routes/reservaRoutes';
import { tokenRoutes, usuarioRoutes } from './routes/usuarioRoutes';
import { AppError } from './erros/AppError';
import { rotaNaoEncontrada, tratarErros } from './middlewares/tratarErros';

const origensPermitidas = (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean);

const app = express();

app.use(helmet());
// Quem pode chamar a API pelo navegador: os endereços do CORS_ORIGINS (o front)
// e a própria API (a página do Swagger em /docs, com o "Try it out").
function mesmoEndereco(origem: string, host: string | undefined): boolean {
  try {
    return new URL(origem).host === host;
  } catch {
    return false;
  }
}

app.use(
  cors((req, callback) => {
    const origem = req.headers.origin;
    if (!origem || origensPermitidas.includes(origem) || mesmoEndereco(origem, req.headers.host)) {
      return callback(null, { origin: true });
    }
    return callback(new AppError('Origem não permitida pelo CORS', 403));
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
app.use('/relatorios', relatorioRoutes);

// Documentação: a página do Swagger em /docs e o arquivo OpenAPI em /docs.json.
app.get('/docs.json', (_req, res) => {
  res.json(openapi);
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'API de Reservas' }));

// Esses dois ficam sempre por último.
app.use(rotaNaoEncontrada);
app.use(tratarErros);

export default app;
