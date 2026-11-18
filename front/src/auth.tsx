import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { api, usarToken } from './api';
import type { Usuario } from './tipos';

// Guarda quem está logado no painel e deixa isso disponível pra qualquer tela (Context do React).
// O token fica no localStorage: fechar a aba não desloga. Ele vence sozinho no prazo da API.

type Sessao = { token: string; usuario: Usuario };
type Auth = {
  usuario: Usuario | null;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => void;
};

const CHAVE = 'casa-brasa:sessao';
const AuthContext = createContext<Auth | null>(null);

function lerSessao(): Sessao | null {
  try {
    const salvo = localStorage.getItem(CHAVE);
    return salvo ? (JSON.parse(salvo) as Sessao) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(() => {
    const salva = lerSessao();
    usarToken(salva?.token ?? null);
    return salva;
  });

  const sair = useCallback(() => {
    localStorage.removeItem(CHAVE);
    usarToken(null);
    setSessao(null);
  }, []);

  // Se a API responder 401 (token vencido), desloga.
  usarToken(sessao?.token ?? null, sair);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { dados } = await api.entrar(email, senha);
    localStorage.setItem(CHAVE, JSON.stringify(dados));
    usarToken(dados.token);
    setSessao(dados);
  }, []);

  return <AuthContext.Provider value={{ usuario: sessao?.usuario ?? null, entrar, sair }}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth precisa estar dentro do AuthProvider');
  return auth;
}
