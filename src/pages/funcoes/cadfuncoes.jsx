import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { APIGERENCIADOR } from '../../config-web'
import './cadfuncoes.css'

function CadFuncoes({ embedded = false, onCreated, onCancel }) {
  const [descricao, setDescricao] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const navigate = useNavigate()

  async function incluirFuncao(event) {
    event.preventDefault()
    setErro('')
    const token = localStorage.getItem('token')
    const expiry = Number(localStorage.getItem('tokenExpiresAt'))
    if (!token || !expiry || expiry <= Date.now()) {
      localStorage.removeItem('token')
      localStorage.removeItem('tokenExpiresAt')
      localStorage.removeItem('emp_id')
      localStorage.removeItem('user_cod')
      navigate('/Login')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`http://${APIGERENCIADOR}/cadastrarfuncao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ func_desc: descricao.trim() })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Não foi possível cadastrar a função')
      }

      if (onCreated) {
        onCreated(data.funcao)
      } else {
        window.alert(`Função cadastrada com o código ${data.funcao.func_cod}.`)
        navigate('/ConsFuncoes')
      }
    } catch (error) {
      setErro(error.message)
    } finally {
      setSaving(false)
    }
  }

  const form = (
    <form className="cad-funcoes-form" onSubmit={incluirFuncao}>
      <div className="cad-funcoes-field">
        <label htmlFor={embedded ? 'nova-funcao-desc-modal' : 'nova-funcao-desc'}>Descrição da função</label>
        <input
          id={embedded ? 'nova-funcao-desc-modal' : 'nova-funcao-desc'}
          type="text"
          maxLength={200}
          autoComplete="off"
          value={descricao}
          onChange={(event) => setDescricao(event.target.value)}
          required
          autoFocus
        />
      </div>
      {erro && <p className="cad-funcoes-error" role="alert">{erro}</p>}
      <div className="cad-funcoes-actions">
        {embedded ? (
          <button className="cad-funcoes-action cad-funcoes-action--back" type="button" onClick={onCancel}>
            Voltar às funções
          </button>
        ) : (
          <Link className="cad-funcoes-action cad-funcoes-action--back" to="/ConsFuncoes">
            Voltar
          </Link>
        )}
        <button className="cad-funcoes-action cad-funcoes-action--confirm" type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Incluir função'}
        </button>
      </div>
    </form>
  )

  if (embedded) {
    return (
      <div className="cad-funcoes-overlay">
        <section className="cad-funcoes-dialog" role="dialog" aria-modal="true" aria-labelledby="cad-funcoes-modal-title">
          <header className="cad-funcoes-header">
            <p>CADASTRO</p>
            <h2 id="cad-funcoes-modal-title">Nova função</h2>
          </header>
          {form}
        </section>
      </div>
    )
  }

  return (
    <main className="cad-funcoes-page">
      <section className="cad-funcoes-content" aria-labelledby="cad-funcoes-title">
        <header className="cad-funcoes-header">
          <p>CADASTRO</p>
          <h1 id="cad-funcoes-title">Função</h1>
        </header>
        {form}
      </section>
    </main>
  )
}

export default CadFuncoes
