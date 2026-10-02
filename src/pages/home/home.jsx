import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { APIGERENCIADOR } from '../../config-web'
import './home.css'

function Home() {
  const [companyName, setCompanyName] = useState('Nome da empresa')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    let active = true
    fetch(`http://${APIGERENCIADOR}/contexto`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (response) => {
        if (!response.ok) return null
        return response.json()
      })
      .then((data) => {
        if (active && data?.emp_nome) setCompanyName(data.emp_nome)
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  return (
    <main className="home-page">
      <header className="home-brand" aria-labelledby="home-title">
        <div className="home-brand__image" aria-hidden="true" />
        <div className="home-brand__text">
          <p>Painel de gestão</p>
          <h1 id="home-title">{companyName}</h1>
        </div>
      </header>

      <section className="home-dashboard" aria-label="Dashboard" />

      <nav className="home-navigation" aria-label="Consultas">
        <h2>O que deseja?</h2>
        <div className="home-options">
          <Link className="home-option" to="/ConsUsuarios">
            <span className="home-option__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="10" cy="7" r="4" />
                <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <span className="home-option__copy">
              <strong>Colaboradores</strong>
              <small>Consulta de usuários</small>
            </span>
            <span className="home-option__arrow" aria-hidden="true">&#8594;</span>
          </Link>
          <Link className="home-option" to="/ConsEscalas">
            <span className="home-option__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2" />
              </svg>
            </span>
            <span className="home-option__copy">
              <strong>Escalas</strong>
              <small>Consulta de escalas</small>
            </span>
            <span className="home-option__arrow" aria-hidden="true">&#8594;</span>
          </Link>
          <Link className="home-option" to="/ConsFuncoes">
            <span className="home-option__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 6h14M5 12h14M5 18h14" />
                <circle cx="3" cy="6" r="0.5" />
                <circle cx="3" cy="12" r="0.5" />
                <circle cx="3" cy="18" r="0.5" />
              </svg>
            </span>
            <span className="home-option__copy">
              <strong>Funções</strong>
              <small>Consulta de funções</small>
            </span>
            <span className="home-option__arrow" aria-hidden="true">&#8594;</span>
          </Link>
        </div>
      </nav>
    </main>
  )
}

export default Home