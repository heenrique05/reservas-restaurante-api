import { useState } from 'react';
import { api } from '../api';
import { hojeEmBrasilia, horaDe } from '../horarios';
import type { EntradaDaFila } from '../tipos';
import { Numero, SeletorDeDia } from './ReservasDoDia';
import { NOME_ESPERA } from './status';
import { useCarregar } from './useCarregar';

// Quem está esperando mesa no dia, agrupado por horário, na ordem de chegada.
export function FilaDoDia() {
  const [dia, setDia] = useState(hojeEmBrasilia());
  const [aviso, setAviso] = useState('');
  const { dados, carregando, erro, recarregar } = useCarregar(async () => (await api.filaDoDia(dia)).dados, [dia], 30);

  // Agrupa por horário: { "20:00": [Carla, Ana], "21:00": [...] }
  const porHorario = new Map<string, EntradaDaFila[]>();
  for (const e of [...(dados ?? [])].sort((a, b) => a.dataHora.localeCompare(b.dataHora) || a.id - b.id)) {
    const hora = horaDe(e.dataHora);
    porHorario.set(hora, [...(porHorario.get(hora) ?? []), e]);
  }
  const esperando = (dados ?? []).filter((e) => e.status === 'aguardando').length;

  async function tirar(e: EntradaDaFila) {
    if (!window.confirm(`Tirar ${e.nomeCliente} da lista de espera?`)) return;
    try {
      await api.tirarDaFila(e.id);
      setAviso(`${e.nomeCliente} saiu da fila.`);
      await recarregar();
    } catch (erro) {
      setAviso(erro instanceof Error ? erro.message : 'Não deu certo');
    }
  }

  return (
    <section className="tela">
      <SeletorDeDia dia={dia} onMudar={setDia} />

      <div className="numeros">
        <Numero valor={esperando} rotulo="na fila agora" />
        <Numero valor={(dados ?? []).filter((e) => e.status === 'atendida').length} rotulo="ganharam mesa" />
      </div>

      <p className="explica">
        Quando uma reserva é cancelada ou expira, a mesa vai sozinha para o primeiro da fila daquele horário.
      </p>
      {aviso && <p className="aviso-painel">{aviso}</p>}
      {erro && <p className="erros">{erro}</p>}
      {carregando && !dados && <p className="aviso">Carregando...</p>}
      {dados && dados.length === 0 && <p className="aviso">Ninguém na lista de espera nesse dia.</p>}

      {[...porHorario].map(([hora, entradas]) => {
        let posicao = 0;
        return (
          <div key={hora} className="grupo">
            <h3>{hora}</h3>
            <ul className="lista">
              {entradas.map((e) => {
                if (e.status === 'aguardando') posicao += 1;
                return (
                  <li key={e.id} className={`linha espera-${e.status}`}>
                    <div className="hora">{e.status === 'aguardando' ? `${posicao}º` : '–'}</div>
                    <div className="quem-reservou">
                      <strong>{e.nomeCliente}</strong>
                      <span>
                        {e.pessoas} {e.pessoas === 1 ? 'pessoa' : 'pessoas'} ·{' '}
                        <a href={`https://wa.me/55${e.telefone}`} target="_blank" rel="noreferrer">
                          {e.telefone}
                        </a>
                      </span>
                      {e.reservaId && <small>Virou a reserva nº {e.reservaId}</small>}
                    </div>
                    <span className={`etiqueta-status ${e.status}`}>{NOME_ESPERA[e.status]}</span>
                    <div className="botoes">
                      {e.status === 'aguardando' && (
                        <button type="button" className="botao pequeno secundario" onClick={() => tirar(e)}>
                          Tirar da fila
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
