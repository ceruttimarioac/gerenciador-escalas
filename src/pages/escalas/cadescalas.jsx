import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { APIGERENCIADOR } from '../../config-web'
import './cadescalas.css'

const LIMITE_FUNCOES_POR_ESCALA = 30

function obterTokenValido() {
  const token = localStorage.getItem('token')
  const expiracao = Number(localStorage.getItem('tokenExpiresAt'))

  return token && expiracao && expiracao > Date.now() ? token : null
}

function limparSessao(navigate) {
  localStorage.removeItem('token')
  localStorage.removeItem('tokenExpiresAt')
  navigate('/Login')
}

function criarItemEscala(funcao, usuario = null) {
  return {
    id: crypto.randomUUID(),
    func_cod: funcao.func_cod,
    func_desc: funcao.func_desc,
    user_cod: usuario?.user_cod ?? null,
    user_nome: usuario?.user_nome ?? '',
    cod_user_func: usuario?.cod_user_func ?? null
  }
}

function codigoEscalaValido(codigo) {
  const numero = Number(codigo)
  return Number.isSafeInteger(numero) && numero > 0
}

function CadEscalas() {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState('')
  const [data, setData] = useState('')
  const [periodo, setPeriodo] = useState('M')
  const [funcoes, setFuncoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState('')
  const [sucessoSalvar, setSucessoSalvar] = useState('')
  const [carregandoEscala, setCarregandoEscala] = useState(false)
  const [codigoCarregado, setCodigoCarregado] = useState('')
  const [erroConsulta, setErroConsulta] = useState('')
  const [funcaoSelecionada, setFuncaoSelecionada] = useState('')
  const [funcoesEscala, setFuncoesEscala] = useState([])
  // Seleção de colaboradores
  const [itemAberto, setItemAberto] = useState(null)
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState([])
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false)
  const [erroUsuarios, setErroUsuarios] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function carregarFuncoes() {
      const token = obterTokenValido()
      if (!token) {
        navigate('/Login')
        return
      }
      try {
        const response = await fetch(
          `http://${APIGERENCIADOR}/consultafuncoes?q=`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            },
            signal: controller.signal
          }
        )
        if (response.status === 401) {
          limparSessao(navigate)
          return
        }
        const resultado = await response.json()
        if (!response.ok || !Array.isArray(resultado.funcoes)) {
          throw new Error(
            resultado.message || 'Erro ao carregar funções'
          )
        }
        if (!controller.signal.aborted) {
          setFuncoes(resultado.funcoes)
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setErro(error.message)
        }
      } finally {
        if (!controller.signal.aborted) {
          setCarregando(false)
        }
      }
    }
    carregarFuncoes()
    return () => controller.abort()
  }, [navigate])

  // Aguarda o usuário terminar de digitar antes de consultar a escala.
  useEffect(() => {
    if (!codigo) return

    const numero = Number(codigo)
    if (!codigoEscalaValido(codigo)) return

    const controller = new AbortController()

    const timer = setTimeout(async () => {
      try {
        const token = obterTokenValido()
        if (!token) {
          navigate('/Login')
          return
        }

        const response = await fetch(
          `http://${APIGERENCIADOR}/consultarescala/${numero}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal
          }
        )
        if (response.status === 401) {
          limparSessao(navigate)
          return
        }

        const resultado = await response.json()
        if (!response.ok || !resultado.success || !resultado.escala || !Array.isArray(resultado.itens)) {
          throw new Error(resultado.message || 'Não foi possível consultar a escala.')
        }
        if (controller.signal.aborted) return

        setData(String(resultado.escala.esc_data).slice(0, 10))
        setPeriodo(resultado.escala.esc_periodo)
        setFuncoesEscala(
          resultado.itens.map((item) => criarItemEscala(item, item))
        )
        setItemAberto(null)
        setUsuariosDisponiveis([])
        setErroUsuarios('')
        setCodigoCarregado(String(numero))
      } catch (error) {
        if (error.name !== 'AbortError' && !controller.signal.aborted) {
          setErroConsulta(error.message)
        }
      } finally {
        if (!controller.signal.aborted) setCarregandoEscala(false)
      }
    }, 450)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [codigo, navigate])

  function alterarCodigo(novoCodigo) {
    setCodigo(novoCodigo)
    setCarregandoEscala(novoCodigo !== '' && codigoEscalaValido(novoCodigo))
    setCodigoCarregado('')
    setErroConsulta(
      novoCodigo && !codigoEscalaValido(novoCodigo)
        ? 'Informe um código de escala válido.'
        : ''
    )
    setErroSalvar('')
    setSucessoSalvar('')
    setData('')
    setPeriodo('M')
    setFuncoesEscala([])
    setItemAberto(null)
    setUsuariosDisponiveis([])
  }

  function adicionarFuncao() {
    if (!funcaoSelecionada) {
      window.alert('Selecione uma função.')
      return
    }
    if (funcoesEscala.length >= LIMITE_FUNCOES_POR_ESCALA) {
      window.alert(`O limite é de ${LIMITE_FUNCOES_POR_ESCALA} funções por escala.`)
      return
    }
    const funcao = funcoes.find(
      (item) => String(item.func_cod) === funcaoSelecionada
    )
    if (!funcao) return
    setFuncoesEscala((anteriores) => [
      ...anteriores,
      criarItemEscala(funcao)
    ])
  }
  function removerFuncao(id) {
    setFuncoesEscala((anteriores) =>
      anteriores.filter((item) => item.id !== id)
    )
    if (itemAberto === id) {
      setItemAberto(null)
      setUsuariosDisponiveis([])
    }
  }
  async function abrirSelecao(item) {
    if (!data) {
      window.alert('Selecione primeiro a data da escala.')
      return
    }
    if (itemAberto === item.id) {
      setItemAberto(null)
      return
    }
    const token = obterTokenValido()
    if (!token) {
      navigate('/Login')
      return
    }
    setItemAberto(item.id)
    setUsuariosDisponiveis([])
    setErroUsuarios('')
    setCarregandoUsuarios(true)
    try {
      const parametros = new URLSearchParams({
        funcCod: String(item.func_cod),
        data
      })
      const response = await fetch(
        `http://${APIGERENCIADOR}/consultarusuariosdisponiveis?${parametros}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      if (response.status === 401) {
        limparSessao(navigate)
        return
      }
      const resultado = await response.json()
      if (!response.ok || !Array.isArray(resultado.usuarios)) {
        throw new Error(
          resultado.message ||
          'Erro ao consultar colaboradores disponíveis'
        )
      }
      const usuariosFiltrados = resultado.usuarios.filter(
        (usuario) =>
          !funcoesEscala.some(
            (vaga) =>
              vaga.id !== item.id &&
              String(vaga.user_cod) === String(usuario.user_cod)
          )
      )
      setUsuariosDisponiveis(usuariosFiltrados)
    } catch (error) {
      setErroUsuarios(error.message)
    } finally {
      setCarregandoUsuarios(false)
    }
  }
  function selecionarUsuario(itemId, usuario) {
    const jaSelecionado = funcoesEscala.some(
      (item) =>
        item.id !== itemId &&
        String(item.user_cod) === String(usuario.user_cod)
    )
    if (jaSelecionado) {
      window.alert(
        'Este colaborador já foi selecionado para outra função nesta escala.'
      )
      return
    }
    setFuncoesEscala((anteriores) =>
      anteriores.map((item) =>
        item.id === itemId
          ? {
              ...item,
              user_cod: usuario.user_cod,
              user_nome: usuario.user_nome,
              cod_user_func: usuario.cod_user_func
            }
          : item
      )
    )
    setItemAberto(null)
    setUsuariosDisponiveis([])
  }
  function limparUsuario(itemId) {
    setFuncoesEscala((anteriores) =>
      anteriores.map((item) =>
        item.id === itemId
          ? {
              ...item,
              user_cod: null,
              user_nome: '',
              cod_user_func: null
            }
          : item
      )
    )
  }
  // Alterar a data invalida as seleções anteriores.
  function alterarData(novaData) {
    setData(novaData)
    setItemAberto(null)
    setUsuariosDisponiveis([])
    setErroUsuarios('')
    setFuncoesEscala((anteriores) =>
      anteriores.map((item) => ({
        ...item,
        user_cod: null,
        user_nome: '',
        cod_user_func: null
      }))
    )
  }
  async function salvarEscala() {
    if (salvando || carregandoEscala) return

    const atualizando = codigo !== ''
    if (atualizando && codigoCarregado !== codigo) {
      setErroSalvar('Aguarde carregar uma escala válida antes de atualizar.')
      return
    }

    setErroSalvar('')
    setSucessoSalvar('')

    if (!data) {
      setErroSalvar('Informe a data da escala.')
      return
    }
    if (funcoesEscala.length === 0) {
      setErroSalvar('Adicione pelo menos uma função.')
      return
    }
    const todosColaboradoresSelecionados = funcoesEscala.every((item) =>
      Number.isSafeInteger(Number(item.cod_user_func)) &&
      Number(item.cod_user_func) > 0
    )
    if (!todosColaboradoresSelecionados) {
      setErroSalvar('Selecione um colaborador para cada função.')
      return
    }
    const usuarios = funcoesEscala.map((item) => String(item.user_cod))
    if (new Set(usuarios).size !== usuarios.length) {
      setErroSalvar('Um colaborador não pode ocupar duas funções nesta escala.')
      return
    }

    const token = obterTokenValido()
    if (!token) {
      navigate('/Login')
      return
    }

    setSalvando(true)
    try {
      const endpoint = atualizando
        ? `http://${APIGERENCIADOR}/atualizaescalas/${codigoCarregado}`
        : `http://${APIGERENCIADOR}/inseriescalas`
      const response = await fetch(endpoint, {
        method: atualizando ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          data,
          periodo,
          itens: funcoesEscala.map((item) => ({
            cod_user_func: Number(item.cod_user_func)
          }))
        })
      })
      if (response.status === 401) {
        limparSessao(navigate)
        return
      }
      const resultado = await response.json()
      if (!response.ok || !resultado.success) {
        throw new Error(resultado.message || 'Não foi possível salvar a escala.')
      }
      if (atualizando) {
        setSucessoSalvar(`Escala ${codigoCarregado} atualizada com sucesso!`)
      } else {
        const novoCodigo = resultado.escala?.esc_cod
        if (novoCodigo != null) {
          setCarregandoEscala(true)
          setCodigo(String(novoCodigo))
        }
        setSucessoSalvar(`Escala ${novoCodigo ?? ''} cadastrada com sucesso!`)
      }
      setItemAberto(null)
      setUsuariosDisponiveis([])
    } catch (error) {
      setErroSalvar(error.message || 'Erro de comunicação ao salvar a escala.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <main
      className="cad-escalas-page"
      aria-busy={salvando || carregandoEscala}
    >
      {salvando && (
        <div
          className="cad-escalas-overlay"
          role="status"
          aria-live="polite"
        >
          {codigo ? 'Atualizando escala, aguarde...' : 'Cadastrando escala, aguarde...'}
        </div>
      )}
      <section className="cad-escalas-content">
        <header className="cad-escalas-header">
          <p>CADASTRO</p>
          <h1>Cadastro de Escalas</h1>
        </header>
        {erroSalvar && (
          <p className="cad-escalas-error" role="alert">
            {erroSalvar}
          </p>
        )}
        {sucessoSalvar && (
          <p className="cad-escalas-success" role="status">
            {sucessoSalvar}
          </p>
        )}
        {carregandoEscala && <p role="status">Consultando escala, aguarde...</p>}
        {erroConsulta && (
          <p className="cad-escalas-error" role="alert">
            {erroConsulta}
          </p>
        )}
        {codigoCarregado && !carregandoEscala && (
          <p className="cad-escalas-success" role="status">
            Escala {codigoCarregado} carregada. Você pode editar e confirmar a
            atualização.
          </p>
        )}
        <section className="cad-escalas-section">
          <h2>Dados da escala</h2>
          <div className="cad-escalas-form">
            <label htmlFor="esc-codigo">
              Código da escala
            </label>
            <input
              id="esc-codigo"
              type="number"
              min="1"
              value={codigo}
              onChange={(event) => alterarCodigo(event.target.value)}
              disabled={salvando}
              placeholder="Deixe vazio para incluir"
            />
            <label htmlFor="esc-data">
              Data da escala
            </label>
            <input
              id="esc-data"
              type="date"
              value={data}
              onChange={(event) =>
                alterarData(event.target.value)
              }
            />
            <label htmlFor="esc-periodo">
              Período
            </label>
            <select
              id="esc-periodo"
              value={periodo}
              onChange={(event) =>
                setPeriodo(event.target.value)
              }
            >
              <option value="M">Manhã</option>
              <option value="T">Tarde</option>
              <option value="N">Noite</option>
            </select>
          </div>
        </section>
        <section className="cad-escalas-section">
          <h2>Funções da escala</h2>
          <p className="cad-escalas-description">
            Adicione as funções necessárias. A mesma função pode aparecer mais
            de uma vez, até o limite de {LIMITE_FUNCOES_POR_ESCALA}.
          </p>
          {erro && (
            <p className="cad-escalas-error" role="alert">
              {erro}
            </p>
          )}
          <div className="cad-escalas-function-selector">
            <div className="cad-escalas-field">
              <label htmlFor="esc-funcao">
                Selecionar função
              </label>
              <select
                id="esc-funcao"
                value={funcaoSelecionada}
                onChange={(event) =>
                  setFuncaoSelecionada(event.target.value)
                }
                disabled={carregando || !!erro}
              >
                <option value="">
                  {carregando
                    ? 'Carregando funções...'
                    : 'Selecione uma função'}
                </option>
                {funcoes.map((funcao) => (
                  <option
                    key={funcao.func_cod}
                    value={funcao.func_cod}
                  >
                    {funcao.func_cod} - {funcao.func_desc}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="cad-escalas-add"
              onClick={adicionarFuncao}
              disabled={
                carregando ||
                !!erro ||
                !funcaoSelecionada ||
                funcoesEscala.length >= LIMITE_FUNCOES_POR_ESCALA
              }
            >
              + Adicionar
            </button>
          </div>
          <div className="cad-escalas-list-header">
            <h3>Funções adicionadas</h3>
            <span>
              {funcoesEscala.length} / {LIMITE_FUNCOES_POR_ESCALA}
            </span>
          </div>
          {funcoesEscala.length === 0 ? (
            <p className="cad-escalas-empty">
              Nenhuma função adicionada à escala.
            </p>
          ) : (
            <div className="cad-escalas-list">
              {funcoesEscala.map((item, index) => (
                <div key={item.id}>
                  <div className="cad-escalas-function-row">
                    <span className="cad-escalas-number">
                      {index + 1}
                    </span>
                    <div className="cad-escalas-function-name">
                      <strong>{item.func_desc}</strong>
                      <div className="cad-escalas-assignment">
                        <small>
                          {item.user_nome
                            ? `Colaborador: ${item.user_nome}`
                            : 'Nenhum colaborador selecionado'}
                        </small>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cad-escalas-add"
                      onClick={() => abrirSelecao(item)}
                    >
                      {item.user_cod
                        ? 'Alterar'
                        : 'Selecionar colaborador'}
                    </button>
                    {item.user_cod && (
                      <button
                        type="button"
                        className="cad-escalas-remove"
                        onClick={() => limparUsuario(item.id)}
                      >
                        Limpar
                      </button>
                    )}
                    <button
                      type="button"
                      className="cad-escalas-remove"
                      onClick={() => removerFuncao(item.id)}
                    >
                      Remover
                    </button>
                  </div>
                  {itemAberto === item.id && (
                    <div className="cad-escalas-user-panel">
                      <h4>Colaboradores disponíveis</h4>
                      {carregandoUsuarios ? (
                        <p>Carregando colaboradores...</p>
                      ) : erroUsuarios ? (
                        <p
                          className="cad-escalas-error"
                          role="alert"
                        >
                          {erroUsuarios}
                        </p>
                      ) : usuariosDisponiveis.length === 0 ? (
                        <p>
                          Nenhum colaborador disponível
                          para esta função e data.
                        </p>
                      ) : (
                        <div className="cad-escalas-user-list">
                          {usuariosDisponiveis.map((usuario) => (
                            <button
                              key={usuario.cod_user_func}
                              type="button"
                              className="cad-escalas-user-option"
                              onClick={() =>
                                selecionarUsuario(item.id, usuario)
                              }
                            >
                              {usuario.user_nome}
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        className="cad-escalas-remove"
                        onClick={() => setItemAberto(null)}
                      >
                        Fechar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
      <nav className="cad-escalas-actions">
        <div className="cad-escalas-actions-inner">
          <Link
            className="cad-escalas-button"
            to="/ConsEscalas"
          >
            Voltar
          </Link>
          <Link
            className="cad-escalas-button"
            to="/GerarEscalasIA"
          >
            Gerar escala com IA
          </Link>

          <button
            className="cad-escalas-button cad-escalas-primary"
            type="button"
            disabled={
              salvando ||
              carregandoEscala ||
              (!!codigo && codigoCarregado !== codigo)
            }
            onClick={salvarEscala}
          >
            {codigo ? 'Confirmar atualização' : 'Incluir'}
          </button>
        </div>
      </nav>
    </main>
  )
}
export default CadEscalas
