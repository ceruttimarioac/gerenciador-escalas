import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { APIGERENCIADOR } from '../../config-web'
import './consusuarios.css'

function ConsUsuarios() {
  const [filtro, setFiltro] = useState('')
  const [usuarios, setUsuarios] = useState([])
  const [consultando, setConsultando] = useState(false)
  const [erro, setErro] = useState('')
  const requestController = useRef(null)
  const navigate = useNavigate()

  async function consultarUsuarios(valor) {
    requestController.current?.abort()

    const token = localStorage.getItem('token')
    const expiry = Number(localStorage.getItem('tokenExpiresAt'))
    if (!token || !expiry || expiry <= Date.now()) {
      localStorage.removeItem('token')
      localStorage.removeItem('tokenExpiresAt')
      navigate('/Login')
      window.alert('Sessão expirada. Faça login novamente.')
      return
    }

    const controller = new AbortController()
    requestController.current = controller
    setConsultando(true)
    setErro('')

    try {
      const response = await fetch(
        `http://${APIGERENCIADOR}/consultausuario?q=${encodeURIComponent(valor)}`,
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
      if (!response.ok || !Array.isArray(data.usuarios)) {
        throw new Error(data.message || 'Não foi possível consultar colaboradores')
      }

      setUsuarios(data.usuarios)
    } catch (error) {
      if (error.name !== 'AbortError') {
        setErro(error.message)
        setUsuarios([])
      }
    } finally {
      if (!controller.signal.aborted) {
        setConsultando(false)
      }
    }
  }

  return (
    <main className="cons-usuarios-page">
      <section className="cons-usuarios-content" aria-labelledby="cons-usuarios-title">
        <header className="cons-usuarios-header">
          <p>CONSULTA</p>
          <h1 id="cons-usuarios-title">Colaboradores</h1>
        </header>

        <label className="cons-usuarios-filter-label" htmlFor="filtro-usuarios">
          Filtrar por código ou nome
        </label>
        <input
          id="filtro-usuarios"
          className="cons-usuarios-filter"
          type="search"
          placeholder="Digite o código ou nome do colaborador"
          value={filtro}
          onChange={(event) => {
            const valor = event.target.value
            setFiltro(valor)
            consultarUsuarios(valor)
          }}
        />

        <div className="cons-usuarios-grid" aria-live="polite">
          {consultando ? (
            <p className="cons-usuarios-empty">Consultando colaboradores...</p>
          ) : erro ? (
            <p className="cons-usuarios-empty" role="alert">{erro}</p>
          ) : usuarios.length > 0 ? (
            usuarios.map((usuario) => (
              <div className="cons-usuarios-row" key={usuario.codigo}>
                <span className="cons-usuarios-code">{usuario.codigo}</span>
                <span className="cons-usuarios-name">{usuario.nome}</span>
              </div>
            ))
          ) : (
            <p className="cons-usuarios-empty">
              {filtro ? 'Nenhum colaborador encontrado.' : 'Digite para consultar colaboradores.'}
            </p>
          )}
        </div>
      </section>

      <nav className="cons-usuarios-actions" aria-label="Ações de colaboradores">
        <div className="cons-usuarios-actions__inner">
          <Link className="cons-usuarios-action cons-usuarios-action--back" to="/Home">
            Voltar
          </Link>
          <Link className="cons-usuarios-action cons-usuarios-action--include" to="/CadUsuarios">
            Incluir
          </Link>
        </div>
      </nav>
    </main>
  )
}

export default ConsUsuarios