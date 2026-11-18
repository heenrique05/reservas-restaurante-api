import { useState } from 'react';
import { api } from '../api';
import { diaPorExtenso, hojeEmBrasilia, horaDe, somarDias } from '../horarios';
import type { ReservaDoPainel, StatusReserva } from '../tipos';
import { ACOES, NOME_STATUS } from './status';
import { useCarregar } from './useCarregar';

// As reservas de um dia, em ordem de horário, com os botões de cada situação.
// Recarrega sozinha a cada 30 segundos (pra ver reservas novas e as que expiraram).
export function ReservasDoDia() {
  const [dia, setDia] = useState(hojeEmBrasilia());
  const [aviso, setAviso] = useState('');
  const [mexendo, setMexendo] = useState<number | null>(null);
  const { dados, carregando, erro, recarregar } = useCarregar(async () => (await api.reservasDoDia(dia)).dados, [dia], 30);

  const reservas = [...(dados ?? [])].sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  const ativas = reservas.filter((r) => r.status === 'confirmada' || r.status === 'aguardando_sinal');
  const pessoas = ativas.reduce((soma, r) => soma + r.pessoas, 0);

  async function mudar(reserva: ReservaDoPainel, para: StatusReserva, feito: string) {
    if (para === 'cancelada' && !window.confirm(`Cancelar a reserva de ${reserva.nomeCliente}?`)) return;
    setMexendo(reserva.id);
    setAviso('');
    try {
      const { mensagem } = await api.mudarStatus(reserva.id, para);
      // A API responde "Status atualizado. 1 cliente(s) da lista de espera ganharam mesa": só a parte da fila interessa.
      const extra = mensagem.replace(/^Status atualizado\.?\s*/, '');
      setAviso(`${reserva.nomeCliente}: ${feito}.${extra ? ` ${extra}.` : ''}`);
      await recarregar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'Não deu certo');
    } finally {
      setMexendo(null);
    }
  }

  return (
    <section className="tela">
      <SeletorDeDia dia={dia} onMudar={setDia} />

      <div className="numeros">
        <Numero valor={ativas.length} rotulo="reservas ativas" />
        <Numero valor={pessoas} rotulo="pessoas esperadas" />
        <Numero valor={reservas.filter((r) => r.status === 'aguardando_sinal').length} rotulo="aguardando sinal" />
      </div>

      {aviso && <p className="aviso-painel">{aviso}</p>}
      {erro && <p className="erros">{erro}</p>}
      {carregando && !dados && <p className="aviso">Carregando...</p>}
      {dados && reservas.length === 0 && <p className="aviso">Nenhuma reserva nesse dia.</p>}

      <ul className="lista">
        {reservas.map((r) => (
          <li key={r.id} className={`linha status-${r.status}`}>
            <div className="hora">{horaDe(r.dataHora)}</div>
            <div className="quem-reservou">
              <strong>{r.nomeCliente}</strong>
              <span>
                {r.pessoas} {r.pessoas === 1 ? 'pessoa' : 'pessoas'} · mesa {r.mesaNumero} ·{' '}
                <a href={`https://wa.me/55${r.telefone}`} target="_blank" rel="noreferrer">
                  {r.telefone}
                </a>
              </span>
              {r.observacao && <em>“{r.observacao}”</em>}
              {r.status === 'aguardando_sinal' && r.expiraEm && <small>Expira às {horaDe(r.expiraEm)}</small>}
            </div>
            <span className={`etiqueta-status ${r.status}`}>{NOME_STATUS[r.status]}</span>
            <div className="botoes">
              {ACOES[r.status].map((a) => (
                <button
                  key={a.para}
                  type="button"
                  className={`botao pequeno ${a.perigo ? 'secundario' : ''}`}
                  disabled={mexendo === r.id}
                  onClick={() => mudar(r, a.para, a.feito)}
                >
                  {a.texto}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SeletorDeDia({ dia, onMudar }: { dia: string; onMudar: (dia: string) => void }) {
  const hoje = hojeEmBrasilia();
  return (
    <div className="seletor-dia">
      <button type="button" className="botao secundario pequeno" onClick={() => onMudar(somarDias(dia, -1))} aria-label="Dia anterior">
        ←
      </button>
      <div>
        <h2>{diaPorExtenso(dia)}</h2>
        {dia !== hoje && (
          <button type="button" className="link" onClick={() => onMudar(hoje)}>
            voltar para hoje
          </button>
        )}
      </div>
      <button type="button" className="botao secundario pequeno" onClick={() => onMudar(somarDias(dia, 1))} aria-label="Próximo dia">
        →
      </button>
      <input type="date" value={dia} onChange={(e) => e.target.value && onMudar(e.target.value)} aria-label="Escolher dia" />
    </div>
  );
}

export function Numero({ valor, rotulo }: { valor: number | string; rotulo: string }) {
  return (
    <div className="numero">
      <strong>{valor}</strong>
      <span>{rotulo}</span>
    </div>
  );
}
