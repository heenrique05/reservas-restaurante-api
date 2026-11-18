import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

// A "moldura" do painel: o topo com o menu fica fixo e o miolo (Outlet) troca conforme o endereço.
export function LayoutPainel() {
  const { usuario, sair } = useAuth();
  if (!usuario) return null;

  return (
    <div className="painel">
      <header className="painel-topo">
        <div>
          <p className="marca">Casa Brasa · painel</p>
          <p className="quem">
            {usuario.nome} <span className="selo">{usuario.papel === 'dono' ? 'Dono' : 'Equipe'}</span>
          </p>
        </div>
        <nav className="menu">
          <NavLink to="/painel" end>
            Reservas
          </NavLink>
          <NavLink to="/painel/fila">Lista de espera</NavLink>
          {usuario.papel === 'dono' && <NavLink to="/painel/relatorio">Relatório</NavLink>}
        </nav>
        <button type="button" className="botao secundario pequeno" onClick={sair}>
          Sair
        </button>
      </header>

      <main className="painel-miolo">
        <Outlet />
      </main>
    </div>
  );
}
