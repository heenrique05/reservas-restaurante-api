import { useState } from 'react';
import { api } from '../api';
import { hojeEmBrasilia } from '../horarios';
import type { StatusReserva } from '../tipos';
import { Numero } from './ReservasDoDia';
import { NOME_STATUS } from './status';
import { useCarregar } from './useCarregar';

const ORDEM: StatusReserva[] = ['concluida', 'confirmada', 'aguardando_sinal', 'cancelada', 'nao_compareceu', 'expirada'];

// "2026-11" vira o primeiro e o último dia do mês.
function limitesDoMes(mes: string) {
  const [ano, m] = mes.split('-').map(Number);
  const ultimo = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  return { de: `${mes}-01`, ate: `${mes}-${String(ultimo).padStart(2, '0')}` };
}

const porcento = (n: number | null) => (n === null ? '–' : `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);

// O relatório do dono: o mesmo GET /relatorios que você viu no Swagger, agora com cara de painel.
export function RelatorioDoMes() {
  const [mes, setMes] = useState(hojeEmBrasilia().slice(0, 7));
  const { de, ate } = limitesDoMes(mes);
  const { dados: r, carregando, erro } = useCarregar(async () => (await api.relatorio(de, ate)).dados, [de, ate]);

  const maior = Math.max(1, ...ORDEM.map((s) => r?.reservas[s] ?? 0));
  const maiorHorario = Math.max(1, ...(r?.horariosMaisProcurados.map((h) => h.reservas) ?? []));

  return (
    <section className="tela">
      <div className="seletor-dia">
        <h2>Relatório do mês</h2>
        <input type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} aria-label="Escolher mês" />
      </div>

      {erro && <p className="erros">{erro}</p>}
      {carregando && !r && <p className="aviso">Carregando...</p>}

      {r && (
        <>
          <div className="numeros">
            <Numero valor={r.reservas.total} rotulo="reservas no mês" />
            <Numero valor={r.pessoasAtendidas} rotulo="pessoas atendidas" />
            <Numero valor={porcento(r.taxaDeFaltas)} rotulo="taxa de faltas" />
            <Numero valor={porcento(r.taxaDeExpiracao)} rotulo="não pagaram o sinal" />
          </div>

          <div className="duas-colunas">
            <div className="cartao">
              <h3>Como terminaram as reservas</h3>
              {ORDEM.map((s) => (
                <div key={s} className="barra-linha">
                  <span>{NOME_STATUS[s]}</span>
                  <div className="barra">
                    <div className={`barra-cheia ${s}`} style={{ width: `${(r.reservas[s] / maior) * 100}%` }} />
                  </div>
                  <strong>{r.reservas[s]}</strong>
                </div>
              ))}
            </div>

            <div className="cartao">
              <h3>Horários mais procurados</h3>
              {r.horariosMaisProcurados.length === 0 && <p className="aviso">Sem reservas no mês.</p>}
              {r.horariosMaisProcurados.map((h) => (
                <div key={h.horario} className="barra-linha">
                  <span>{h.horario}</span>
                  <div className="barra">
                    <div className="barra-cheia destaque" style={{ width: `${(h.reservas / maiorHorario) * 100}%` }} />
                  </div>
                  <strong>{h.reservas}</strong>
                </div>
              ))}
              <p className="explica">
                Lista de espera: {r.listaEspera.total} pedido(s), {r.listaEspera.atendida} ganharam mesa.
              </p>
            </div>
          </div>

          {r.porDia.length > 0 && (
            <div className="cartao">
              <h3>Dia a dia</h3>
              <div className="tabela-rolagem">
                <table>
                  <thead>
                    <tr>
                      <th>Dia</th>
                      <th>Reservas</th>
                      <th>Vieram</th>
                      <th>Canceladas</th>
                      <th>Faltas</th>
                      <th>Expiradas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.porDia.map((d) => (
                      <tr key={d.dia}>
                        <td>{d.dia.split('-').reverse().slice(0, 2).join('/')}</td>
                        <td>{d.total}</td>
                        <td>{d.concluidas}</td>
                        <td>{d.canceladas}</td>
                        <td>{d.faltas}</td>
                        <td>{d.expiradas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
