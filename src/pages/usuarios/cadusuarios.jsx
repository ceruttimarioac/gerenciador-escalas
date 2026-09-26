import { Link } from 'react-router-dom'
import './cadusuarios.css'

function CadUsuarios() {
  return (
    <main className="cad-usuarios-page">
      <section className="cad-usuarios-content" aria-labelledby="cad-usuarios-title">
        <header className="cad-usuarios-header">
          <p>CADASTRO</p>
          <h1 id="cad-usuarios-title">Colaborador</h1>
        </header>
      </section>

      <div className="cad-usuarios-actions">
        <div className="cad-usuarios-actions__grid">
          <Link className="cad-usuarios-action cad-usuarios-action--back" to="/ConsUsuarios">
            Voltar
          </Link>
          <button className="cad-usuarios-action cad-usuarios-action--confirm" type="button">
            Confirmar
          </button>
        </div>
      </div>
    </main>
  )
}

export default CadUsuarios