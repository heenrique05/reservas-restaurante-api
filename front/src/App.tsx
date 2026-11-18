import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { Reservar } from './paginas/Reservar';
import { Entrar } from './painel/Entrar';
import { FilaDoDia } from './painel/FilaDoDia';
import { LayoutPainel } from './painel/LayoutPainel';
import { RelatorioDoMes } from './painel/RelatorioDoMes';
import { ReservasDoDia } from './painel/ReservasDoDia';

// O mapa do site: cada endereço mostra uma tela.
export default function App() {
  const { usuario } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Reservar />} />
      <Route path="/painel/entrar" element={usuario ? <Navigate to="/painel" replace /> : <Entrar />} />

      {/* Tudo dentro de /painel exige login. Sem login, vai pra tela de entrar. */}
      <Route path="/painel" element={usuario ? <LayoutPainel /> : <Navigate to="/painel/entrar" replace />}>
        <Route index element={<ReservasDoDia />} />
        <Route path="fila" element={<FilaDoDia />} />
        <Route
          path="relatorio"
          element={usuario?.papel === 'dono' ? <RelatorioDoMes /> : <Navigate to="/painel" replace />}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
