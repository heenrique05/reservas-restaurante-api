import { useEffect, useState } from 'react';

// Relógio que conta até o prazo do sinal acabar. Atualiza a cada segundo.
export function Contagem({ ate }: { ate: string }) {
  const fim = new Date(ate).getTime();
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(relogio); // desliga o relógio quando a tela some
  }, []);

  const restante = Math.max(0, Math.floor((fim - agora) / 1000));
  if (restante === 0) {
    return <p className="contagem acabou">O prazo acabou e a mesa foi liberada. Você pode tentar reservar de novo.</p>;
  }

  const minutos = String(Math.floor(restante / 60)).padStart(2, '0');
  const segundos = String(restante % 60).padStart(2, '0');
  return (
    <p className="contagem">
      Pague o sinal em <strong>{minutos}:{segundos}</strong>
    </p>
  );
}
