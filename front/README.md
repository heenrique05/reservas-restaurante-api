# Site de reservas (front-end)

A página onde o cliente reserva a mesa. Feita em **React + TypeScript + Vite** e conversa com a API da pasta de cima.

## O que o cliente faz

1. Escolhe o **dia** e **quantas pessoas**.
2. Vê a **grade de horários** (11:00 às 22:30). Livre = reserva na hora. Lotado = entra na **lista de espera**.
3. Preenche **nome, telefone** e, se quiser, e-mail e observação.
4. Recebe a **confirmação** com um relógio de **5 minutos** pra pagar o sinal (ou a posição na fila).

Se duas pessoas tentarem a última mesa ao mesmo tempo, a API recusa a segunda (409) e o site atualiza a grade sozinho.

## Como rodar

Primeiro ligue a API (na pasta de cima, `npm run dev`). Depois, nesta pasta:

```bash
npm install
npm run dev
```

Abra http://localhost:5173

Para apontar pra outra API, crie um `.env` com base no `.env.example`.

## Organização

```
src/
  api.ts            todas as chamadas à API num lugar só
  horarios.ts       regras de horário (as mesmas da API)
  tipos.ts          formatos dos dados
  App.tsx           a página e o estado de cada etapa
  componentes/
    EscolhaDia.tsx         dia e pessoas
    GradeHorarios.tsx      os horários livres e lotados
    FormularioCliente.tsx  dados do cliente, com validação
    Confirmacao.tsx        reserva feita ou posição na fila
    Contagem.tsx           relógio do prazo do sinal
```
