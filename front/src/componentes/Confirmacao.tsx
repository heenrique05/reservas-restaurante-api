import { diaPorExtenso, horaDe } from '../horarios';
import type { Resultado } from '../tipos';
import { Contagem } from './Contagem';

type Props = { resultado: Resultado; onNova: () => void };

// Etapa 4: deu certo! Mostra o que foi feito e o próximo passo.
export function Confirmacao({ resultado, onNova }: Props) {
  const item = resultado.tipo === 'reserva' ? resultado.reserva : resultado.entrada;
  const quando = `${diaPorExtenso(item.dataHora)}, às ${horaDe(item.dataHora)}`;

  return (
    <section className="cartao confirmacao">
      {resultado.tipo === 'reserva' ? (
        <>
          <p className="etiqueta">Reserva nº {resultado.reserva.id}</p>
          <h2>Sua mesa está separada, {primeiroNome(item.nomeCliente)}!</h2>
          <p className="quando">
            {quando} · {item.pessoas} {item.pessoas === 1 ? 'pessoa' : 'pessoas'}
          </p>
          {resultado.reserva.expiraEm && <Contagem ate={resultado.reserva.expiraEm} />}
          <p className="explica">
            A mesa fica guardada enquanto o relógio corre. O pagamento do sinal por Pix entra na próxima versão do site.
          </p>
        </>
      ) : (
        <>
          <p className="etiqueta">Lista de espera</p>
          <h2>Você é o número {resultado.entrada.posicao} da fila</h2>
          <p className="quando">
            {quando} · {item.pessoas} {item.pessoas === 1 ? 'pessoa' : 'pessoas'}
          </p>
          <p className="explica">
            Se uma mesa liberar, ela vai sozinha para o primeiro da fila. Aí você terá 15 minutos para pagar o sinal.
          </p>
        </>
      )}

      <button type="button" className="botao secundario" onClick={onNova}>
        Fazer outra reserva
      </button>
    </section>
  );
}

function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0];
}
