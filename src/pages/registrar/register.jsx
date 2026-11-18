import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { APIGERENCIADOR } from '../../config-web'
import { useFeedback } from '../../components/feedback-context.js'
import '../autenticacao.css'

function Registrar() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { showFeedback } = useFeedback()

 async function controller(event) {
  event.preventDefault()
  if (!event.currentTarget.checkValidity()) {
    showFeedback('Informe um email válido e uma senha com pelo menos 6 caracteres.', {
      title: 'Dados incompletos',
      tone: 'error'
    })
    return
  }

  setLoading(true)

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

  if (data.success) {
  showFeedback('Registro realizado com sucesso! Faça login para continuar.', {
    title: 'Registro concluído',
    tone: 'success',
    onOk: () => navigate('/Login')
  })
  } else {
      throw new Error(data.message || 'Erro ao fazer registro')
    }

  } catch (err) {
    showFeedback(err.message, { title: 'Não foi possível fazer o registro', tone: 'error' })
  } finally {
    setLoading(false)
  }
}

  return (
    <main className="registrar-page">
      <section className="registrar-panel" aria-labelledby="login-title">
        <h1 id="login-title">Registrar</h1>
        <form className="registrar-form" onSubmit={controller} noValidate>
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
            minLength={6}
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