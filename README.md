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
| POST | `/usuarios` | Só no 1º | O primeiro cadastro vira o **dono**. Depois, só o dono cadastra a equipe (`nome`, `email`, `senha`, `papel` opcional) |
| GET | `/usuarios` | Dono | Lista a equipe |
| POST | `/tokens` | Não | Faz login (`email`, `senha`) e devolve o token |
| GET | `/usuarios/eu` | Sim | Mostra os dados de quem está logado |
| GET | `/mesas` | Sim | Lista as mesas |
| POST | `/mesas` | Dono | Cadastra uma mesa (`numero`, `lugares`) |
| PATCH | `/mesas/:id` | Dono | Altera ou desativa uma mesa (`numero`, `lugares`, `ativa`) |
| POST | `/reservas` | Não | O cliente reserva (`nomeCliente`, `telefone`, `pessoas`, `dataHora`, `email` e `observacao` opcionais) |
| GET | `/reservas?data=2026-11-20` | Sim | Reservas do dia, com o número da mesa |
| PATCH | `/reservas/:id/status` | Sim | Muda o status (`confirmada`, `cancelada`, `concluida`, `nao_compareceu`) |
| POST | `/lista-espera` | Não | Entra na fila de um horário lotado (mesmos dados da reserva) |
| GET | `/lista-espera?data=2026-11-20` | Sim | A fila do dia, em ordem de chegada |
| PATCH | `/lista-espera/:id/cancelar` | Sim | Tira alguém da fila |
| GET | `/disponibilidade?data=2026-11-20&pessoas=3` | Não | Os horários do dia que ainda têm mesa para o grupo |

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

## Regras das reservas

- O restaurante abre das 11h à 1h. As reservas começam de 30 em 30 minutos, das **11:00 às 22:30** (a última precisa caber inteira antes de fechar)
- O cliente vê os horários livres em `/disponibilidade`, escolhe um, e a API escolhe a **menor mesa livre** que caiba o grupo
- Cada reserva ocupa a mesa por **2h30**, mais **15 minutos de folga** para arrumar a mesa antes da próxima
- Quem reserva tem **5 minutos para pagar o sinal**. Não pagou, a reserva **expira sozinha** e a mesa volta a ficar livre
- Reserva cancelada, concluída, expirada ou com falta libera a mesa, e a lista de espera é avisada
- A data precisa vir com o fuso (`2026-11-20T20:00:00-03:00`), ser no futuro e no máximo 60 dias à frente
- O status só anda para a frente: aguardando sinal → confirmada → concluída (ou falta); cancelar vale até a confirmação
- Mesa não é apagada, é desativada, para não perder o histórico

**Duas pessoas pedindo a última mesa no mesmo segundo:** a reserva roda numa transaction que trava as mesas (`FOR UPDATE`). A segunda espera a primeira terminar e já enxerga a reserva dela. Há um teste que faz exatamente isso; sem a trava, ele falha em cerca de 1 a cada 4 execuções.

### Prazo do sinal

- A reserva nasce com um prazo (`expiraEm`). Dentro dele, a mesa é da pessoa; passou, a mesa já conta como livre para novas reservas, sem esperar nada
- De 30 em 30 segundos, o servidor marca as reservas vencidas como **expirada** e avisa a lista de espera
- Depois do prazo, não dá mais para confirmar a reserva: é preciso reservar de novo

### Lista de espera

- Com o horário lotado, o cliente entra na fila e recebe a posição dele. Se ainda houver mesa livre, a API manda reservar direto
- Quando uma mesa libera (cancelamento, prazo do sinal vencido, falta ou saída antes da hora), ela vai sozinha para o primeiro da fila que quer um horário que se cruza com o liberado. A reserva dele nasce "aguardando sinal", com **15 minutos para pagar**: mais tempo, porque ele precisa ver o aviso primeiro. Não pagou, a mesa passa para o próximo
- O `ReservaService` não conhece a lista de espera: ele só avisa "uma mesa liberou" a quem estiver ouvindo (padrão Observer). Se esse aviso falhar, o cancelamento continua valendo
- A fila também é travada numa transaction: se duas mesas liberarem ao mesmo tempo, ninguém ganha duas mesas. Há um teste para isso; sem a trava, ele falha em todas as execuções

As regras ficam juntas em `src/config/regras.ts`, e as peças são montadas em `src/container.ts`.

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
├── config/             # Variáveis do .env e regras do restaurante
├── database/           # Conexão (Singleton) e migrations
├── middlewares/        # Login obrigatório, permissão do dono e tratamento de erros
├── validacao/          # Validação dos dados com regex
├── auth/               # Gera e confere o JWT
├── erros/              # Classe AppError
└── tipos/              # Tipos do domínio e da resposta
```

O service depende de uma interface de repositório, e não do Knex direto. Por isso os testes usam um repositório de mentira (mock) e rodam sem banco.

## Segurança

- Só o primeiro cadastro é aberto, e ele vira o dono. Dois "primeiros" cadastros ao mesmo tempo entram um de cada vez (advisory lock), então nunca nascem dois donos
- Depois disso, só o dono cadastra gente nova; quem ele cadastra entra como funcionário, a não ser que ele peça outro dono
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
- [x] Mesas e reservas, sem conflito de horário
- [x] Lista de espera, com a mesa passando sozinha para o primeiro da fila
- [x] Prazo do sinal com expiração automática, horário de funcionamento e horários disponíveis
- [ ] Painel e relatório
- [ ] Sinal por Pix com webhook
- [ ] Front-end em React e publicação

## Autor

Henrique · [GitHub](https://github.com/heenrique05)
