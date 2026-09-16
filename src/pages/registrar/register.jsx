import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { APIGERENCIADOR } from '../../config-web'
import './registrar.css'

function Registrar() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function controller(event) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('http://' + APIGERENCIADOR + '/registrar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao fazer registro')
      }

      if(response.ok) {
        window.alert('Registro realizado com sucesso! Faça login para continuar.')
      }

    } catch (err) {
      setError(err.message)
      console.log(err.message)
      window.alert('Erro ao fazer registro: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="registrar-page">
      <section className="registrar-panel" aria-labelledby="login-title">
        <h1 id="login-title">Registrar</h1>
        <form className="registrar-form" onSubmit={controller}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            Registrar
          </button>
          
          <Link className="register-link-text" to="/Login">
            Logar-se
          </Link>
        </form>
      </section>
    </main>
  )
}

export default Registrar