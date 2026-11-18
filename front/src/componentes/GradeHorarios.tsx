import type { Horario } from '../tipos';

type Props = {
  horarios: Horario[];
  escolhido: string | null;
  onEscolher: (horario: Horario) => void;
};

// Etapa 2: a grade com os horários do dia.
// Livre = dá pra reservar. Lotado = dá pra entrar na lista de espera.
export function GradeHorarios({ horarios, escolhido, onEscolher }: Props) {
  if (horarios.length === 0) {
    return <p className="aviso">Não sobrou nenhum horário nesse dia. Que tal escolher outra data?</p>;
  }

  const livres = horarios.filter((h) => h.livre).length;

  return (
    <section className="grade-bloco">
      <p className="resumo-grade">
        {livres > 0
          ? `${livres} ${livres === 1 ? 'horário livre' : 'horários livres'}. Os lotados aceitam lista de espera.`
          : 'Tudo lotado nesse dia, mas você pode entrar na lista de espera de qualquer horário.'}
      </p>

      <div className="grade">
        {horarios.map((h) => (
          <button
            key={h.horario}
            type="button"
            className={`horario ${h.livre ? 'livre' : 'lotado'} ${escolhido === h.horario ? 'escolhido' : ''}`}
            onClick={() => onEscolher(h)}
            aria-pressed={escolhido === h.horario}
          >
            <strong>{h.horario}</strong>
            <small>{h.livre ? 'livre' : 'lista de espera'}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
