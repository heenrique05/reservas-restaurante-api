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
- PostgreSQL com Prisma *(próxima etapa)*
- Login com JWT e senha com bcrypt *(próxima etapa)*
- Validação com Zod
- Testes automatizados
- Documentação com Swagger
- Front-end em React

## Como rodar

Precisa do Node.js instalado.

```bash
git clone https://github.com/heenrique05/reservas-restaurante-api.git
cd reservas-restaurante-api
npm install
```

Copie o arquivo `.env.example` para `.env` e ajuste se precisar. Depois:

```bash
npm run dev
```

A API sobe em `http://localhost:3001`.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Roda em modo desenvolvimento, reiniciando a cada alteração |
| `npm run typecheck` | Confere os tipos sem gerar arquivos |
| `npm run build` | Gera a versão final na pasta `dist` |
| `npm start` | Roda a versão gerada pelo build |

## Formato das respostas

Toda resposta segue o mesmo formato:

```json
{
  "sucesso": true,
  "dados": { "nome": "API de reservas", "versao": "1.0.0" },
  "mensagem": "API funcionando"
}
```

Quando dá erro, `sucesso` vem `false` e a `mensagem` explica o motivo, sempre com o status HTTP certo (404, 403, 409...).

## Estrutura

```
src/
├── app.ts              # Configuração do Express
├── server.ts           # Sobe o servidor
├── routes/             # Rotas
├── middlewares/        # Tratamento de erros e rota não encontrada
├── erros/              # Classe AppError
├── tipos/              # Tipos do domínio (usuário, mesa, reserva) e da resposta
└── pagamentos/         # Contrato de pagamento do sinal
```

## Etapas

- [x] Estrutura inicial com Express e TypeScript
- [x] Tipos do domínio, tratamento de erros e resposta padrão
- [ ] Banco PostgreSQL com Prisma e cadastro de usuário
- [ ] Login com JWT e rotas protegidas
- [ ] Mesas e reservas, com testes
- [ ] Painel e relatório
- [ ] Sinal por Pix com webhook
- [ ] Front-end em React e publicação

## Autor

Henrique · [GitHub](https://github.com/heenrique05)
