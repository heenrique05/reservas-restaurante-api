import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';

// Tela de login do painel. Manda e-mail e senha pra POST /tokens e guarda o token.
export function Entrar() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
      // Não precisa navegar: o App vê que tem usuário e leva pro painel sozinho.
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu pra entrar');
      setEnviando(false);
    }
  }

  return (
    <div className="pagina entrar">
      <header className="topo">
        <p className="marca">Casa Brasa</p>
        <h1>Área do restaurante</h1>
        <p className="subtitulo">Entre com o e-mail e a senha da equipe.</p>
      </header>

      <form className="cartao formulario" onSubmit={enviar}>
        <label>
          <span>E-mail</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </label>
        <label>
          <span>Senha</span>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
        </label>
        {erro && <p className="erros">{erro}</p>}
        <button type="submit" className="botao" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="rodape">
        <Link to="/">Voltar para a página de reservas</Link>
      </p>
    </div>
  );
}
