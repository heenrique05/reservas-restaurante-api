import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ErroApi } from '../api';
import { Confirmacao } from '../componentes/Confirmacao';
import { EscolhaDia } from '../componentes/EscolhaDia';
import { FormularioCliente } from '../componentes/FormularioCliente';
import { GradeHorarios } from '../componentes/GradeHorarios';
import { dataHoraIso, diaPorExtenso, hojeEmBrasilia, jaPassou, todosOsHorarios } from '../horarios';
import type { DadosCliente, Horario, Resultado } from '../tipos';

// A página do cliente. Guarda o "estado" de cada etapa e decide o que aparece na tela:
// 1. escolher dia e pessoas  2. escolher o horário  3. preencher os dados  4. confirmação
export function Reservar() {
  const [dia, setDia] = useState(hojeEmBrasilia());
  const [pessoas, setPessoas] = useState(2);
  const [horarios, setHorarios] = useState<Horario[] | null>(null);
  const [escolhido, setEscolhido] = useState<Horario | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const formularioRef = useRef<HTMLDivElement>(null);

  // Pergunta à API quais horários têm mesa. Os que não vieram na resposta estão lotados.
  async function buscarHorarios(diaBusca = dia, pessoasBusca = pessoas) {
    setCarregando(true);
    setErro('');
    setEscolhido(null);
    try {
      const { dados } = await api.horariosLivres(diaBusca, pessoasBusca);
      const livres = new Set(dados.map((h) => h.horario));
      setHorarios(
        todosOsHorarios()
          .filter((h) => !jaPassou(diaBusca, h))
          .map((h) => ({ horario: h, livre: livres.has(h) })),
      );
    } catch (e) {
      setHorarios(null);
      setErro(e instanceof Error ? e.message : 'Algo deu errado');
    } finally {
      setCarregando(false);
    }
  }

  function escolher(horario: Horario) {
    setEscolhido(horario);
    setErro('');
    // Rola a tela até o formulário, que aparece logo abaixo da grade.
    setTimeout(() => formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  async function enviar(dados: DadosCliente) {
    if (!escolhido) return;
    setEnviando(true);
    setErro('');
    const dataHora = dataHoraIso(dia, escolhido.horario);
    try {
      if (escolhido.livre) {
        const { dados: reserva, mensagem } = await api.reservar(dados, pessoas, dataHora);
        setResultado({ tipo: 'reserva', reserva, mensagem });
      } else {
        const { dados: entrada, mensagem } = await api.entrarNaFila(dados, pessoas, dataHora);
        setResultado({ tipo: 'espera', entrada, mensagem });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : 'Algo deu errado';
      // 409 = alguém pegou a última mesa enquanto a pessoa preenchia. Atualiza a grade.
      if (e instanceof ErroApi && e.status === 409) await buscarHorarios();
      setErro(mensagem);
    } finally {
      setEnviando(false);
    }
  }

  function recomecar() {
    setResultado(null);
    setEscolhido(null);
    setHorarios(null);
    setErro('');
  }

  return (
    <div className="pagina">
      <header className="topo">
        <p className="marca">Casa Brasa</p>
        <h1>Reserve sua mesa</h1>
        <p className="subtitulo">Aberto todos os dias, das 11h à 1h. Cada reserva garante a mesa por 2h30.</p>
      </header>

      <main>
        {resultado ? (
          <Confirmacao resultado={resultado} onNova={recomecar} />
        ) : (
          <>
            <EscolhaDia
              dia={dia}
              pessoas={pessoas}
              carregando={carregando}
              onMudarDia={(novo) => {
                setDia(novo);
                setHorarios(null);
              }}
              onMudarPessoas={(novo) => {
                setPessoas(novo);
                setHorarios(null);
              }}
              onBuscar={() => buscarHorarios()}
            />

            {erro && !escolhido && <p className="erros">{erro}</p>}

            {horarios && (
              <GradeHorarios horarios={horarios} escolhido={escolhido?.horario ?? null} onEscolher={escolher} />
            )}

            {escolhido && (
              <div ref={formularioRef}>
                <FormularioCliente
                  key={escolhido.horario}
                  descricao={`${diaPorExtenso(dia)}, às ${escolhido.horario} · ${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'}`}
                  listaDeEspera={!escolhido.livre}
                  enviando={enviando}
                  erro={erro}
                  onEnviar={enviar}
                  onVoltar={() => setEscolhido(null)}
                />
              </div>
            )}
          </>
        )}
      </main>

      <footer className="rodape">
        Projeto de portfólio · Henrique · React + API Node/Express · <Link to="/painel">Área do restaurante</Link>
      </footer>
    </div>
  );
}
