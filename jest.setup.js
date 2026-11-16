// Valores só para os testes.
process.env.JWT_SECRET = 'segredo-so-para-testes';
process.env.JWT_EXPIRACAO = '1h';
process.env.CORS_ORIGINS = '';

// Trava de segurança: o dotenv não sobrescreve variáveis que já existem.
// Preenchendo aqui, o banco do seu .env (o do Neon) nunca é usado nos testes.
// O teste de integração troca estes valores pela DATABASE_URL_TESTE.
process.env.DATABASE_URL = 'postgres://banco-de-teste-nao-configurado';
process.env.DATABASE_URL_POOLED = 'postgres://banco-de-teste-nao-configurado';
