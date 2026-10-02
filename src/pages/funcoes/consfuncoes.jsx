import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { APIGERENCIADOR } from '../../config-web'
import './consfuncoes.css'

function ConsFuncoes() {
  const [filter, setFilter] = useState('')
  const [functions, setFunctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestController = useRef(null)
  const navigate = useNavigate()

  async function loadFunctions(value, initial = false) {
    requestController.current?.abort()
    const token = localStorage.getItem('token')
    const expiry = Number(localStorage.getItem('tokenExpiresAt'))
    if (!token || !expiry || expiry <= Date.now()) {
      localStorage.removeItem('token')
      localStorage.removeItem('tokenExpiresAt')
      navigate('/Login')
      return
    }

    const controller = new AbortController()
    requestController.current = controller
    if (!initial) {
      setLoading(true)
      setError('')
    }

    try {
      const query = new URLSearchParams({ q: value })
      const response = await fetch(`http://${APIGERENCIADOR}/consultafuncoes?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      })
      if (response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('tokenExpiresAt')
        navigate('/Login')
        return
      }
      const data = await response.json()
      if (!response.ok || !Array.isArray(data.funcoes)) {
        throw new Error(data.message || 'Não foi possível consultar funções')
      }
      setFunctions(data.funcoes)
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setError(requestError.message)
        setFunctions([])
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  const loadAllFunctions = useEffectEvent(() => loadFunctions('', true))

  useEffect(() => {
    const timeoutId = window.setTimeout(() => loadAllFunctions(), 0)
    return () => {
      window.clearTimeout(timeoutId)
      requestController.current?.abort()
    }
  }, [])

  return (
    <main className="cons-funcoes-page">
      <section className="cons-funcoes-content" aria-labelledby="cons-funcoes-title">
        <header className="cons-funcoes-header">
          <p>CONSULTA</p>
          <h1 id="cons-funcoes-title">Funções</h1>
        </header>

        <label className="cons-funcoes-filter-label" htmlFor="filtro-funcoes">
          Filtrar por código ou descrição
        </label>
        <input
          id="filtro-funcoes"
          className="cons-funcoes-filter"
          type="search"
          placeholder="Digite o código ou descrição da função"
          value={filter}
          onChange={(event) => {
            const value = event.target.value
            setFilter(value)
            loadFunctions(value)
          }}
        />

        <div className="cons-funcoes-list" aria-live="polite">
          {loading ? (
            <p className="cons-funcoes-empty">Consultando funções...</p>
          ) : error ? (
            <p className="cons-funcoes-empty" role="alert">{error}</p>
          ) : functions.length ? (
            functions.map((item) => (
              <div className="cons-funcoes-row" key={item.func_cod}>
                <span className="cons-funcoes-code">{item.func_cod}</span>
                <span className="cons-funcoes-description">{item.func_desc}</span>
              </div>
            ))
          ) : (
            <p className="cons-funcoes-empty">
              {filter ? 'Nenhuma função encontrada.' : 'Nenhuma função cadastrada.'}
            </p>
          )}
        </div>
      </section>

      <nav className="cons-funcoes-actions" aria-label="Ações de funções">
        <div className="cons-funcoes-actions__inner">
          <Link className="cons-funcoes-action cons-funcoes-action--back" to="/Home">Voltar</Link>
          <Link className="cons-funcoes-action cons-funcoes-action--include" to="/CadFuncoes">Incluir</Link>
        </div>
      </nav>
    </main>
  )
}

export default ConsFuncoes
