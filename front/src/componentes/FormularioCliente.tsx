import { useState, type FormEvent } from 'react';
import type { DadosCliente } from '../tipos';

type Props = {
  descricao: string; // "sexta-feira, 20 de novembro, às 20:00, 4 pessoas"
  listaDeEspera: boolean;
  enviando: boolean;
  erro: string;
  onEnviar: (dados: DadosCliente) => void;
  onVoltar: () => void;
};

// As mesmas regras da API (validacao/reservas.ts), conferidas antes de enviar.
// A API confere de novo: a validação do site é só pra ajudar o cliente.
const TELEFONE = /^[1-9]{2}\d{8,9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// "11987654321" vira "(11) 98765-4321" enquanto a pessoa digita
function formatarTelefone(numeros: string): string {
  const n = numeros.slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

// Etapa 3: os dados de quem vai reservar.
export function FormularioCliente({ descricao, listaDeEspera, enviando, erro, onEnviar, onVoltar }: Props) {
  const [dados, setDados] = useState<DadosCliente>({ nomeCliente: '', telefone: '', email: '', observacao: '' });
  const [problemas, setProblemas] = useState<string[]>([]);

  function mudar(campo: keyof DadosCliente, valor: string) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    const lista: string[] = [];
    if (dados.nomeCliente.trim().length < 2) lista.push('Escreva seu nome');
    if (!TELEFONE.test(dados.telefone)) lista.push('Telefone com DDD, como (11) 98765-4321');
    if (dados.email.trim() && !EMAIL.test(dados.email.trim())) lista.push('Confira o e-mail');
    setProblemas(lista);
    if (lista.length === 0) onEnviar(dados);
  }

  return (
    <form className="cartao formulario" onSubmit={enviar} noValidate>
      <div className="cabeca-form">
        <p className="etiqueta">{listaDeEspera ? 'Lista de espera' : 'Sua reserva'}</p>
        <h2>{descricao}</h2>
        {listaDeEspera && (
          <p className="explica">
            Esse horário está lotado. Se alguém cancelar, a mesa vai sozinha para o primeiro da fila, e você tem 15
            minutos para pagar o sinal.
          </p>
        )}
      </div>

      <label>
        <span>Nome</span>
        <input value={dados.nomeCliente} onChange={(e) => mudar('nomeCliente', e.target.value)} autoComplete="name" maxLength={100} />
      </label>

      <label>
        <span>Telefone (WhatsApp)</span>
        <input
          value={formatarTelefone(dados.telefone)}
          onChange={(e) => mudar('telefone', e.target.value.replace(/\D/g, '').slice(0, 11))}
          inputMode="numeric"
          autoComplete="tel"
          placeholder="(11) 98765-4321"
        />
      </label>

      <label>
        <span>
          E-mail <em>(opcional)</em>
        </span>
        <input type="email" value={dados.email} onChange={(e) => mudar('email', e.target.value)} autoComplete="email" />
      </label>

      <label>
        <span>
          Observação <em>(opcional)</em>
        </span>
        <textarea
          value={dados.observacao}
          onChange={(e) => mudar('observacao', e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Aniversário, cadeirinha de bebê, alergia..."
        />
      </label>

      {problemas.length > 0 && (
        <ul className="erros">
          {problemas.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {erro && <p className="erros">{erro}</p>}

      <div className="acoes">
        <button type="button" className="botao secundario" onClick={onVoltar} disabled={enviando}>
          Voltar
        </button>
        <button type="submit" className="botao" disabled={enviando}>
          {enviando ? 'Enviando...' : listaDeEspera ? 'Entrar na fila' : 'Reservar'}
        </button>
      </div>
    </form>
  );
}
