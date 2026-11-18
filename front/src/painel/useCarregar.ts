import { useCallback, useEffect, useState } from 'react';

// Um "hook" nosso: busca dados na API, guarda carregando/erro e recarrega a cada X segundos.
// As telas do painel usam ele pra não repetir esse código.
export function useCarregar<T>(buscar: () => Promise<T>, dependencias: unknown[], recarregarACadaSeg = 0) {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Refaz a função de busca só quando as dependências mudam (ex.: o dia escolhido).
  const recarregar = useCallback(async () => {
    try {
      setDados(await buscar());
      setErro('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Algo deu errado');
    } finally {
      setCarregando(false);
    }
  }, dependencias);

  useEffect(() => {
    setCarregando(true);
    void recarregar();
    if (!recarregarACadaSeg) return;
    const relogio = setInterval(() => void recarregar(), recarregarACadaSeg * 1000);
    return () => clearInterval(relogio);
  }, [recarregar, recarregarACadaSeg]);

  return { dados, carregando, erro, recarregar };
}
