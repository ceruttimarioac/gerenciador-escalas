import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { APIGERENCIADOR } from '../../config-web'
import './consescalas.css'

function ConsEscalas() {
  const [filtro, setFiltro] = useState('')
  const [escalas, setEscalas] = useState([])
  const [consultando, setConsultando] = useState(true)
  const [erro, setErro] = useState('')
  const requestController = useRef(null)
  const navigate = useNavigate()

  async function consultarEscalas(valor) {
    requestController.current?.abort()

    const token = localStorage.getItem('token')
    const expiry = Number(localStorage.getItem('tokenExpiresAt'))
    if (!token || !expiry || expiry <= Date.now()) {
      localStorage.removeItem('token')
      localStorage.removeItem('tokenExpiresAt')
      navigate('/Login')
      window.alert('Sessão expirada. Faça login novamente.')
      setConsultando(false)
      return
    }

    const controller = new AbortController()
    requestController.current = controller
    setConsultando(true)
    setErro('')

    try {
      const response = await fetch(
        `http://${APIGERENCIADOR}/consultaescalas?q=${encodeURIComponent(valor)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        },
      )

      if (response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('tokenExpiresAt')
        navigate('/Login')
        return
      }

      const data = await response.json()
      if (!response.ok || !Array.isArray(data.escalas)) {
        throw new Error(data.message || 'Não foi possível consultar as escalas')
      }

      setEscalas(data.escalas)
    } catch (error) {
      if (error.name !== 'AbortError') {
        setErro(error.message)
        setEscalas([])
      }
    } finally {
      if (!controller.signal.aborted) {
        setConsultando(false)
      }
    }
  }

  const consultarTodasEscalas = useEffectEvent(() => consultarEscalas(''))

  useEffect(() => {
    const timeoutId = window.setTimeout(() => consultarTodasEscalas(), 0)
    return () => {
      window.clearTimeout(timeoutId)
      requestController.current?.abort()
    }
  }, [])

  return (
    <main className="cons-usuarios-page">
      <section className="cons-usuarios-content" aria-labelledby="cons-usuarios-title">
        <header className="cons-usuarios-header">
          <p>CONSULTA</p>
          <h1 id="cons-usuarios-title">Escalas</h1>
        </header>

        <label className="cons-usuarios-filter-label" htmlFor="filtro-usuarios">
          Filtrar por código, data ou período
        </label>
        <input
          id="filtro-usuarios"
          className="cons-usuarios-filter"
          type="search"
          placeholder="Código, data (AAAA-MM-DD) ou período"
          value={filtro}
          onChange={(event) => {
            const valor = event.target.value
            setFiltro(valor)
            consultarEscalas(valor)
          }}
        />

        <div className="cons-usuarios-grid" aria-live="polite">
          {consultando ? (
            <p className="cons-usuarios-empty">Consultando escalas...</p>
          ) : erro ? (
            <p className="cons-usuarios-empty" role="alert">{erro}</p>
          ) : escalas.length > 0 ? (
            escalas.map((escala) => (
              <button
                className="cons-usuarios-row"
                type="button"
                key={escala.esc_cod}
                onClick={() => navigate('/GerarEscalasIA', { state: { escala } })}
                aria-label={`Abrir escala ${escala.esc_cod} na geração de escalas`}
              >
                <span className="cons-usuarios-code">{escala.esc_cod}</span>
                <span className="cons-usuarios-name">
                  {new Date(`${escala.esc_data}T00:00:00`).toLocaleDateString('pt-BR')} · {
                    { M: 'Manhã', T: 'Tarde', N: 'Noite' }[escala.esc_periodo]
                  } · {escala.total_colaboradores} {
                    escala.total_colaboradores === 1 ? 'colaborador' : 'colaboradores'
                  }
                </span>
              </button>
            ))
          ) : (
            <p className="cons-usuarios-empty">
              {filtro ? 'Nenhuma escala encontrada.' : 'Nenhuma escala cadastrada.'}
            </p>
          )}
        </div>
      </section>

      <nav className="cons-usuarios-actions" aria-label="Ações de escalas">
        <div className="cons-usuarios-actions__inner">
          <Link className="cons-usuarios-action cons-usuarios-action--back" to="/Home">
            Voltar
          </Link>
          <Link className="cons-usuarios-action cons-usuarios-action--include" to="/GerarEscalasIA">
            Gerar escala
          </Link>
        </div>
      </nav>
    </main>
  )
}

export default ConsEscalas