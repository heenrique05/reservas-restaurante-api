import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../erros/AppError';
import { falha } from '../tipos/resposta';

// Rota que não existe: responde 404 em vez da página padrão do Express.
export const rotaNaoEncontrada: RequestHandler = (req, res) => {
  res.status(404).json(falha(`Rota ${req.method} ${req.path} não existe`));
};

// Último middleware: pega qualquer erro lançado nas rotas.
// O Express 5 já manda pra cá os erros de funções async, sem try/catch em toda rota.
// Seção 19: o erro chega como unknown. Seção 21: type guard com instanceof.
export const tratarErros: ErrorRequestHandler = (erro: unknown, req, res, _next) => {
  if (erro instanceof AppError) {
    res.status(erro.status).json(falha(erro.message));
    return;
  }

  console.error(erro);
  res.status(500).json(falha('Erro interno no servidor'));
};
