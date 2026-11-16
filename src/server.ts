import app from './app';
import { reservaService } from './container';

const porta = Number(process.env.PORT) || 3001;
const A_CADA_MS = 30 * 1000;

// De 30 em 30 segundos: reserva que passou do prazo do sinal vira "expirada"
// e a mesa vai para o próximo da lista de espera.
// Mesmo entre uma rodada e outra, uma reserva vencida já não segura a mesa (veja ocupaAMesa).
async function expirarSinaisVencidos() {
  try {
    const { expiradas, atendidosDaFila } = await reservaService.expirarVencidas();
    if (expiradas > 0) {
      console.log(`${expiradas} reserva(s) expirada(s), ${atendidosDaFila} cliente(s) da fila ganharam mesa`);
    }
  } catch (erro) {
    console.error('Erro ao expirar os sinais vencidos:', erro);
  }
}

app.listen(porta, () => {
  console.log(`API rodando em http://localhost:${porta}`);
  void expirarSinaisVencidos();
  setInterval(expirarSinaisVencidos, A_CADA_MS);
});
