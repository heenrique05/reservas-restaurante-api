# Site de reservas (front-end)

A página onde o cliente reserva a mesa e o painel da equipe do restaurante. Feita em **React + TypeScript + Vite** e conversa com a API da pasta de cima.

## O que o cliente faz

1. Escolhe o **dia** e **quantas pessoas**.
2. Vê a **grade de horários** (11:00 às 22:30). Livre = reserva na hora. Lotado = entra na **lista de espera**.
3. Preenche **nome, telefone** e, se quiser, e-mail e observação.
4. Recebe a **confirmação** com um relógio de **5 minutos** pra pagar o sinal (ou a posição na fila).

Se duas pessoas tentarem a última mesa ao mesmo tempo, a API recusa a segunda (409) e o site atualiza a grade sozinho.

## Painel do restaurante (/painel)

- **Entrar** com e-mail e senha da equipe (o token do login fica guardado no navegador)
- **Reservas do dia**: quem vem, a que horas, em qual mesa, com os botões *Sinal pago*, *Chegou*, *Não veio* e *Cancelar*. Atualiza sozinha a cada 30 segundos
- **Lista de espera** do dia, por horário e na ordem de chegada
- **Relatório do mês** (só o dono): totais, taxa de faltas, horários mais procurados e o dia a dia

Quando uma reserva é cancelada, a API passa a mesa para o primeiro da fila, e o painel avisa.

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
  auth.tsx          quem está logado (Context do React)
  App.tsx           o mapa do site: cada endereço, uma tela (React Router)
  paginas/
    Reservar.tsx    a página do cliente e o estado de cada etapa
  painel/
    Entrar.tsx           login da equipe
    LayoutPainel.tsx     topo com o menu
    ReservasDoDia.tsx    reservas do dia e os botões de status
    FilaDoDia.tsx        lista de espera
    RelatorioDoMes.tsx   relatório do dono
    useCarregar.ts       hook que busca dados e recarrega sozinho
  componentes/
    EscolhaDia.tsx         dia e pessoas
    GradeHorarios.tsx      os horários livres e lotados
    FormularioCliente.tsx  dados do cliente, com validação
    Confirmacao.tsx        reserva feita ou posição na fila
    Contagem.tsx           relógio do prazo do sinal
```
