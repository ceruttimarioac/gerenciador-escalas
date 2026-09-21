import { Link } from 'react-router-dom'
import './home.css'

function Home() {
  return (
    <main className="home-page">
      <section className="home-panel" aria-labelledby="home-title">
        <h1 id="home-title">Página inicial</h1>
        <div className="home-options">
          <Link className="home-option" to="/Escalas">
            Escalas
          </Link>
          <Link className="home-option" to="/Usuarios">
            Colaboradores
          </Link>
        </div>
      </section>
    </main>
  )
}

export default Home