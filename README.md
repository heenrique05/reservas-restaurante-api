# API de Reservas de Restaurante

API para um restaurante receber reservas online e diminuir as faltas. O cliente reserva pela página pública e paga um sinal por Pix. O restaurante acompanha tudo num painel com o mapa de mesas, a lista de espera e um relatório.

> Projeto em desenvolvimento. Estou construindo por etapas, e cada etapa vira um commit.

## O que o sistema vai fazer

- Página pública para o cliente fazer a reserva
- Painel do restaurante com mapa de mesas
- Lista de espera quando não houver mesa livre
- Sinal por Pix, confirmado automaticamente pelo webhook do Mercado Pago
- Confirmação da reserva por WhatsApp
- Relatório de reservas, cancelamentos e faltas

## Tecnologias

- Node.js com TypeScript
- Express 5
- PostgreSQL (Neon) com Knex: migrations e consultas
- Login com JWT e senha guardada com bcrypt
- Validação com expressões regulares
- Testes com Jest e Supertest
- Front-end em React *(etapa futura)*

## Como rodar

Precisa do Node.js e de um banco PostgreSQL (eu uso o plano grátis do [Neon](https://neon.com)).

```bash
git clone https://github.com/heenrique05/reservas-restaurante-api.git
cd reservas-restaurante-api
npm install
```

Copie o `.env.example` para `.env` e preencha o endereço do banco e o `JWT_SECRET`. Depois:

```bash
npm run db:migrate   # cria as tabelas
npm run dev          # sobe a API em http://localhost:3001
```

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Roda em modo desenvolvimento, reiniciando a cada alteração |
| `npm test` | Roda os testes |
| `npm run test:coverage` | Roda os testes e mostra quanto do código foi testado |
| `npm run db:migrate` | Cria ou atualiza as tabelas do banco |
| `npm run db:rollback` | Desfaz a última migration |
| `npm run typecheck` | Confere os tipos sem gerar arquivos |
| `npm run build` | Gera a versão final na pasta `dist` |
| `npm start` | Roda a versão gerada pelo build |

Os testes de integração (API + banco de verdade) só rodam se a variável `DATABASE_URL_TESTE` apontar para um banco separado, só de testes, porque eles apagam os dados a cada teste.

## Rotas

| Método | Rota | Login? | O que faz |
| --- | --- | --- | --- |
| GET | `/` | Não | Confere se a API está no ar |
| POST | `/usuarios` | Não | Cadastra um usuário (`nome`, `email`, `senha`) |
| POST | `/tokens` | Não | Faz login (`email`, `senha`) e devolve o token |
| GET | `/usuarios/eu` | Sim | Mostra os dados de quem está logado |

Nas rotas com login, mande o token no cabeçalho:

```
Authorization: Bearer seu-token-aqui
```

## Formato das respostas

Toda resposta segue o mesmo formato:

```json
{
  "sucesso": true,
  "dados": { "id": 1, "nome": "Henrique", "email": "henrique@teste.com", "papel": "dono" },
  "mensagem": "Usuário cadastrado"
}
```

Quando dá erro, `sucesso` vem `false` e a `mensagem` explica o motivo, sempre com o status HTTP certo (400, 401, 404, 409...).

## Como o código é organizado

Cada camada tem uma responsabilidade só:

```
requisição → rota → middleware (login) → controller → service → repository → banco
```

```
src/
├── app.ts, server.ts   # Monta o Express e sobe o servidor
├── routes/             # Endereços da API e montagem das peças
├── controllers/        # Traduzem HTTP: leem o pedido e respondem
├── services/           # Regras do negócio (cadastro, login)
├── repositories/       # Conversa com o banco (interface + versão com Knex)
├── database/           # Conexão (Singleton) e migrations
├── middlewares/        # Login obrigatório e tratamento de erros
├── validacao/          # Validação dos dados com regex
├── auth/               # Gera e confere o JWT
├── erros/              # Classe AppError
└── tipos/              # Tipos do domínio e da resposta
```

O service depende de uma interface de repositório, e não do Knex direto. Por isso os testes usam um repositório de mentira (mock) e rodam sem banco.

## Segurança

- A senha nunca é salva como foi digitada, só o hash do bcrypt, e o hash nunca sai nas respostas
- E-mail repetido é barrado pela API e também pelo banco (coluna única)
- O login responde a mesma mensagem para e-mail inexistente e senha errada
- Token alterado ou vencido é recusado

## Etapas

- [x] Estrutura inicial com Express e TypeScript
- [x] Tipos do domínio, tratamento de erros e resposta padrão
- [x] Banco PostgreSQL com Knex e cadastro de usuário
- [x] Login com JWT e rotas protegidas
- [x] Testes com Jest
- [ ] Mesas e reservas
- [ ] Painel e relatório
- [ ] Sinal por Pix com webhook
- [ ] Front-end em React e publicação

## Autor

Henrique · [GitHub](https://github.com/heenrique05)
