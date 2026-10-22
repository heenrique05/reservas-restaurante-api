import app from './app';

const porta = Number(process.env.PORT) || 3001;

app.listen(porta, () => {
  console.log(`API rodando em http://localhost:${porta}`);
});