import { Link } from 'react-router-dom'
import './home.css'

function Home() {
  return (
    <main className="home-page">
      <header className="home-brand" aria-labelledby="home-title">
        <div className="home-brand__image" aria-hidden="true" />
        <div className="home-brand__text">
          <p>Painel de gestão</p>
          <h1 id="home-title">Nome da empresa</h1>
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
        </div>
      </nav>
    </main>
  )
}

export default Home