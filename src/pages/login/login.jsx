import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { APIGERENCIADOR } from '../../config-web'
import './login.css'

function Login() {
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
      const response = await fetch('http://' + APIGERENCIADOR + '/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao fazer login')
      }

      if(response.ok) {
        localStorage.setItem('token', data.token)
        navigate('/Home')
      }
    } catch (err) {
      setError(err.message)
      console.log(err.message)
      window.alert('Erro ao fazer login: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <h1 id="login-title">Entrar</h1>
        <form className="login-form" onSubmit={controller}>
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
            Login
          </button>
          
          <Link className="register-link-text" to="/Registrar">
            Registrar-se
          </Link>
        </form>
      </section>
    </main>
  )
}

export default Login