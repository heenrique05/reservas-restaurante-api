import { ANTECEDENCIA_MAX_DIAS, MAX_PESSOAS, hojeEmBrasilia, somarDias } from '../horarios';

type Props = {
  dia: string;
  pessoas: number;
  carregando: boolean;
  onMudarDia: (dia: string) => void;
  onMudarPessoas: (pessoas: number) => void;
  onBuscar: () => void;
};

// Etapa 1: o cliente diz quando quer vir e quantas pessoas são.
export function EscolhaDia({ dia, pessoas, carregando, onMudarDia, onMudarPessoas, onBuscar }: Props) {
  const hoje = hojeEmBrasilia();

  return (
    <form
      className="cartao escolha"
      onSubmit={(e) => {
        e.preventDefault(); // sem isso o navegador recarrega a página
        onBuscar();
      }}
    >
      <label>
        <span>Dia</span>
        <input
          type="date"
          value={dia}
          min={hoje}
          max={somarDias(hoje, ANTECEDENCIA_MAX_DIAS)}
          required
          onChange={(e) => onMudarDia(e.target.value)}
        />
      </label>

      <label>
        <span>Pessoas</span>
        <select value={pessoas} onChange={(e) => onMudarPessoas(Number(e.target.value))}>
          {Array.from({ length: MAX_PESSOAS }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'pessoa' : 'pessoas'}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" className="botao" disabled={carregando || !dia}>
        {carregando ? 'Procurando...' : 'Ver horários'}
      </button>
    </form>
  );
}
