import { PRIMEIRO_HORARIO, ULTIMO_HORARIO } from '../config/horarios';
import { regras } from '../config/regras';

// Documentação da API no formato OpenAPI 3, mostrada pelo Swagger em /docs.
// Escrita à mão, junto do código, para sempre contar como a API funciona de verdade.

// 150 -> "2h30", 15 -> "15 minutos"
function duracao(minutos: number): string {
  if (minutos < 60) return `${minutos} minutos`;
  const resto = minutos % 60;
  return `${Math.floor(minutos / 60)}h${resto ? String(resto).padStart(2, '0') : ''}`;
}

const ref = (nome: string) => ({ $ref: `#/components/schemas/${nome}` });

// Toda resposta de sucesso segue o mesmo formato: { sucesso, dados, mensagem }.
function sucesso(descricao: string, dados?: object) {
  return {
    description: descricao,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            sucesso: { type: 'boolean', example: true },
            ...(dados ? { dados } : {}),
            mensagem: { type: 'string' },
          },
        },
      },
    },
  };
}

function erro(descricao: string) {
  return { description: descricao, content: { 'application/json': { schema: ref('Erro') } } };
}

function corpo(schema: object, exemplo?: object) {
  return { required: true, content: { 'application/json': { schema, ...(exemplo ? { example: exemplo } : {}) } } };
}

const comLogin = [{ bearerAuth: [] }];
const parametroId = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } };
const parametroData = {
  name: 'data',
  in: 'query',
  description: 'Dia no formato AAAA-MM-DD. Sem ele, usa o dia de hoje.',
  schema: { type: 'string', format: 'date', example: '2026-11-20' },
};

const erro401 = erro('Sem login, ou token inválido ou vencido');
const erro403 = erro('Logado, mas sem permissão (só o dono pode)');

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'API de Reservas de Restaurante',
    version: '1.0.0',
    description: [
      'Reservas online com sinal, lista de espera e painel do restaurante.',
      '',
      `- Restaurante das ${regras.abertura} à ${regras.fechamento}. Reservas das ${PRIMEIRO_HORARIO} às ${ULTIMO_HORARIO}, de ${regras.intervaloHorariosMin} em ${regras.intervaloHorariosMin} minutos`,
      `- Cada reserva ocupa a mesa por ${duracao(regras.duracaoReservaMin)}, mais ${duracao(regras.folgaEntreReservasMin)} de folga para arrumar a mesa`,
      `- ${regras.prazoSinalMin} minutos para pagar o sinal (${regras.prazoSinalFilaMin} para quem ganha a mesa pela lista de espera). Não pagou, a reserva expira sozinha`,
      '',
      '**Para testar as rotas com cadeado:** faça login em `POST /tokens`, copie o `token` da resposta, clique em **Authorize** e cole.',
    ].join('\n'),
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Início' },
    { name: 'Usuários e login', description: 'O primeiro cadastro vira o dono. Depois, só o dono cadastra a equipe.' },
    { name: 'Mesas', description: 'Só o dono cadastra e altera. Mesa não é apagada, é desativada.' },
    { name: 'Reservas', description: 'O cliente reserva sem login; a equipe acompanha pelo painel.' },
    { name: 'Lista de espera', description: 'Quando uma mesa libera, ela vai sozinha para o primeiro da fila.' },
    { name: 'Relatórios', description: 'Números do período, só para o dono.' },
  ],
  paths: {
    '/': {
      get: { tags: ['Início'], summary: 'Confere se a API está no ar', responses: { 200: sucesso('API funcionando') } },
    },
    '/usuarios': {
      post: {
        tags: ['Usuários e login'],
        summary: 'Cadastra um usuário',
        description:
          'Sem login: só funciona no primeiro cadastro do sistema, que vira o **dono**. Depois disso, só um dono logado cadastra, e a pessoa entra como **funcionario** (ou dono, se pedir).',
        security: [{}, { bearerAuth: [] }],
        requestBody: corpo(ref('NovoUsuario'), { nome: 'Bruna Silva', email: 'bruna@teste.com', senha: 'senha456' }),
        responses: {
          201: sucesso('Usuário cadastrado', ref('Usuario')),
          400: erro('Dados inválidos'),
          401: erro('Já existe um dono: faça login como dono para cadastrar'),
          403: erro403,
          409: erro('E-mail já cadastrado'),
        },
      },
      get: {
        tags: ['Usuários e login'],
        summary: 'Lista a equipe',
        security: comLogin,
        responses: { 200: sucesso('A equipe, sem as senhas', { type: 'array', items: ref('Usuario') }), 401: erro401, 403: erro403 },
      },
    },
    '/usuarios/eu': {
      get: {
        tags: ['Usuários e login'],
        summary: 'Dados de quem está logado',
        security: comLogin,
        responses: { 200: sucesso('Seus dados', ref('Usuario')), 401: erro401 },
      },
    },
    '/tokens': {
      post: {
        tags: ['Usuários e login'],
        summary: 'Login: troca e-mail e senha por um token',
        requestBody: corpo(ref('Login'), { email: 'henrique@teste.com', senha: 'senha123' }),
        responses: {
          200: sucesso('Login feito', {
            type: 'object',
            properties: { token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' }, usuario: ref('Usuario') },
          }),
          400: erro('Faltou e-mail ou senha'),
          401: erro('E-mail ou senha inválidos (a mesma mensagem nos dois casos, de propósito)'),
        },
      },
    },
    '/mesas': {
      get: {
        tags: ['Mesas'],
        summary: 'Lista as mesas',
        security: comLogin,
        responses: { 200: sucesso('As mesas', { type: 'array', items: ref('Mesa') }), 401: erro401 },
      },
      post: {
        tags: ['Mesas'],
        summary: 'Cadastra uma mesa',
        security: comLogin,
        requestBody: corpo(ref('NovaMesa'), { numero: 4, lugares: 6 }),
        responses: {
          201: sucesso('Mesa cadastrada', ref('Mesa')),
          400: erro('Dados inválidos'),
          401: erro401,
          403: erro403,
          409: erro('Já existe uma mesa com esse número'),
        },
      },
    },
    '/mesas/{id}': {
      patch: {
        tags: ['Mesas'],
        summary: 'Altera ou desativa uma mesa',
        security: comLogin,
        parameters: [parametroId],
        requestBody: corpo(ref('EditarMesa'), { ativa: false }),
        responses: {
          200: sucesso('Mesa atualizada', ref('Mesa')),
          400: erro('Dados inválidos'),
          401: erro401,
          403: erro403,
          404: erro('Mesa não encontrada'),
        },
      },
    },
    '/disponibilidade': {
      get: {
        tags: ['Reservas'],
        summary: 'Horários livres do dia para o grupo',
        description: 'O cliente vê antes de reservar. Horários que já passaram não aparecem.',
        parameters: [
          parametroData,
          { name: 'pessoas', in: 'query', required: true, schema: { type: 'integer', minimum: 1, maximum: regras.maxPessoas, example: 3 } },
        ],
        responses: {
          200: sucesso('Os horários com mesa livre', { type: 'array', items: ref('HorarioLivre') }),
          400: erro('Data ou número de pessoas inválido'),
        },
      },
    },
    '/reservas': {
      post: {
        tags: ['Reservas'],
        summary: 'O cliente reserva (sem login)',
        description: `A API escolhe a menor mesa livre que caiba o grupo e segura por ${regras.prazoSinalMin} minutos, o tempo de pagar o sinal.`,
        requestBody: corpo(ref('NovaReserva'), {
          nomeCliente: 'Maria',
          telefone: '11987654321',
          pessoas: 3,
          dataHora: '2026-11-20T20:00:00-03:00',
        }),
        responses: {
          201: sucesso('Reserva feita, aguardando o sinal', ref('Reserva')),
          400: erro('Dados inválidos ou fora do horário de funcionamento'),
          409: erro('Não há mesa livre: entre na lista de espera'),
        },
      },
      get: {
        tags: ['Reservas'],
        summary: 'Reservas do dia (painel)',
        security: comLogin,
        parameters: [parametroData],
        responses: { 200: sucesso('As reservas, com o número da mesa', { type: 'array', items: ref('ReservaComMesa') }), 401: erro401 },
      },
    },
    '/reservas/{id}/status': {
      patch: {
        tags: ['Reservas'],
        summary: 'Muda o status de uma reserva (painel)',
        description:
          'O status só anda para a frente. Cancelar, concluir ou marcar falta libera a mesa, e a lista de espera é avisada. Depois do prazo do sinal, não dá mais para confirmar.',
        security: comLogin,
        parameters: [parametroId],
        requestBody: corpo(
          {
            type: 'object',
            required: ['status'],
            properties: { status: { type: 'string', enum: ['confirmada', 'cancelada', 'concluida', 'nao_compareceu'] } },
          },
          { status: 'confirmada' },
        ),
        responses: {
          200: sucesso('Status atualizado', ref('Reserva')),
          400: erro('Status inválido'),
          401: erro401,
          404: erro('Reserva não encontrada'),
          409: erro('Mudança não permitida, prazo do sinal vencido, ou a reserva foi alterada por outra pessoa'),
        },
      },
    },
    '/lista-espera': {
      post: {
        tags: ['Lista de espera'],
        summary: 'Entra na fila de um horário lotado (sem login)',
        requestBody: corpo(ref('NovaReserva'), {
          nomeCliente: 'Carla',
          telefone: '11955554444',
          pessoas: 3,
          dataHora: '2026-11-20T20:00:00-03:00',
        }),
        responses: {
          201: sucesso('Na fila, com a posição', ref('EntradaEspera')),
          400: erro('Dados inválidos'),
          409: erro('Ainda há mesa livre, ou esse telefone já está na fila desse horário'),
        },
      },
      get: {
        tags: ['Lista de espera'],
        summary: 'A fila do dia (painel)',
        security: comLogin,
        parameters: [parametroData],
        responses: { 200: sucesso('A fila, em ordem de chegada', { type: 'array', items: ref('EntradaEspera') }), 401: erro401 },
      },
    },
    '/lista-espera/{id}/cancelar': {
      patch: {
        tags: ['Lista de espera'],
        summary: 'Tira alguém da fila (painel)',
        security: comLogin,
        parameters: [parametroId],
        responses: {
          200: sucesso('Saiu da fila', ref('EntradaEspera')),
          401: erro401,
          404: erro('Não encontrado'),
          409: erro('Só dá para cancelar quem ainda está aguardando'),
        },
      },
    },
    '/relatorios': {
      get: {
        tags: ['Relatórios'],
        summary: 'Números do período',
        security: comLogin,
        parameters: [
          { name: 'de', in: 'query', description: 'Primeiro dia. Sem datas, usa o mês atual.', schema: { type: 'string', format: 'date', example: '2026-11-01' } },
          { name: 'ate', in: 'query', description: 'Último dia (incluído).', schema: { type: 'string', format: 'date', example: '2026-11-30' } },
        ],
        responses: { 200: sucesso('O relatório', ref('Relatorio')), 400: erro('Período inválido'), 401: erro401, 403: erro403 },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'O token que o POST /tokens devolve.' },
    },
    schemas: {
      Erro: {
        type: 'object',
        properties: { sucesso: { type: 'boolean', example: false }, mensagem: { type: 'string' } },
      },
      Papel: { type: 'string', enum: ['dono', 'funcionario'] },
      StatusReserva: {
        type: 'string',
        enum: ['aguardando_sinal', 'confirmada', 'cancelada', 'concluida', 'nao_compareceu', 'expirada'],
      },
      Usuario: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          nome: { type: 'string' },
          email: { type: 'string', format: 'email' },
          papel: ref('Papel'),
          criadoEm: { type: 'string', format: 'date-time' },
        },
      },
      NovoUsuario: {
        type: 'object',
        required: ['nome', 'email', 'senha'],
        properties: {
          nome: { type: 'string', minLength: 3, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          senha: { type: 'string', minLength: 8, maxLength: 72, description: 'Com letras e números' },
          papel: { ...ref('Papel'), description: 'Opcional. Padrão: funcionario' },
        },
      },
      Login: {
        type: 'object',
        required: ['email', 'senha'],
        properties: { email: { type: 'string', format: 'email' }, senha: { type: 'string' } },
      },
      Mesa: {
        type: 'object',
        properties: { id: { type: 'integer' }, numero: { type: 'integer' }, lugares: { type: 'integer' }, ativa: { type: 'boolean' } },
      },
      NovaMesa: {
        type: 'object',
        required: ['numero', 'lugares'],
        properties: {
          numero: { type: 'integer', minimum: 1, maximum: 999 },
          lugares: { type: 'integer', minimum: 1, maximum: regras.maxPessoas },
          ativa: { type: 'boolean', default: true },
        },
      },
      EditarMesa: {
        type: 'object',
        description: 'Envie pelo menos um campo.',
        properties: { numero: { type: 'integer' }, lugares: { type: 'integer' }, ativa: { type: 'boolean' } },
      },
      NovaReserva: {
        type: 'object',
        required: ['nomeCliente', 'telefone', 'pessoas', 'dataHora'],
        properties: {
          nomeCliente: { type: 'string', minLength: 2, maxLength: 100 },
          telefone: { type: 'string', description: 'Com DDD. Pode ter espaço, traço e parênteses.', example: '(11) 98765-4321' },
          email: { type: 'string', format: 'email' },
          pessoas: { type: 'integer', minimum: 1, maximum: regras.maxPessoas },
          dataHora: {
            type: 'string',
            format: 'date-time',
            description: `Com o fuso. Entre ${PRIMEIRO_HORARIO} e ${ULTIMO_HORARIO}, de ${regras.intervaloHorariosMin} em ${regras.intervaloHorariosMin} minutos.`,
            example: '2026-11-20T20:00:00-03:00',
          },
          observacao: { type: 'string', maxLength: 500 },
        },
      },
      Reserva: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          mesaId: { type: 'integer' },
          nomeCliente: { type: 'string' },
          telefone: { type: 'string' },
          email: { type: 'string' },
          pessoas: { type: 'integer' },
          dataHora: { type: 'string', format: 'date-time', description: 'Início (UTC)' },
          termino: { type: 'string', format: 'date-time', description: 'Quando a mesa libera (UTC)' },
          status: ref('StatusReserva'),
          observacao: { type: 'string' },
          expiraEm: { type: 'string', format: 'date-time', description: 'Até quando dá para pagar o sinal' },
          criadoEm: { type: 'string', format: 'date-time' },
        },
      },
      ReservaComMesa: {
        allOf: [ref('Reserva'), { type: 'object', properties: { mesaNumero: { type: 'integer' } } }],
      },
      HorarioLivre: {
        type: 'object',
        properties: {
          horario: { type: 'string', example: '19:30', description: 'Horário de Brasília' },
          dataHora: { type: 'string', format: 'date-time', description: 'O mesmo horário em UTC, para mandar na reserva' },
          mesasLivres: { type: 'integer' },
        },
      },
      EntradaEspera: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          nomeCliente: { type: 'string' },
          telefone: { type: 'string' },
          pessoas: { type: 'integer' },
          dataHora: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['aguardando', 'atendida', 'cancelada'] },
          reservaId: { type: 'integer', description: 'A reserva criada quando a pessoa ganhou a mesa' },
          posicao: { type: 'integer', description: 'Só na resposta de quem acabou de entrar na fila' },
          criadoEm: { type: 'string', format: 'date-time' },
        },
      },
      Relatorio: {
        type: 'object',
        properties: {
          periodo: { type: 'object', properties: { de: { type: 'string' }, ate: { type: 'string' } } },
          reservas: {
            type: 'object',
            description: 'Quantas reservas em cada status, e o total',
            additionalProperties: { type: 'integer' },
            example: { total: 8, aguardando_sinal: 0, confirmada: 0, cancelada: 1, concluida: 4, nao_compareceu: 1, expirada: 2 },
          },
          pessoasAtendidas: { type: 'integer' },
          taxaDeFaltas: { type: 'number', nullable: true, description: '% de quem tinha mesa garantida e não veio' },
          taxaDeExpiracao: { type: 'number', nullable: true, description: '% das reservas sem sinal pago a tempo' },
          porDia: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dia: { type: 'string' },
                total: { type: 'integer' },
                concluidas: { type: 'integer' },
                canceladas: { type: 'integer' },
                faltas: { type: 'integer' },
                expiradas: { type: 'integer' },
              },
            },
          },
          horariosMaisProcurados: {
            type: 'array',
            items: { type: 'object', properties: { horario: { type: 'string' }, reservas: { type: 'integer' } } },
          },
          listaEspera: {
            type: 'object',
            additionalProperties: { type: 'integer' },
            example: { total: 3, aguardando: 1, atendida: 2, cancelada: 0 },
          },
        },
      },
    },
  },
};
