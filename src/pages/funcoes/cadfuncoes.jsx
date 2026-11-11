import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { APIGERENCIADOR } from '../../config-web'
import './cadfuncoes.css'

function CadFuncoes({ embedded = false, onCreated, onCancel }) {
  const { funcCod } = useParams()
  const location = useLocation()
  const selectedFunction = location.state?.funcao
  const editing = !embedded && Boolean(funcCod)
  const [descricao, setDescricao] = useState(selectedFunction?.func_desc || '')
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!editing) return undefined

    const controller = new AbortController()
    async function carregarFuncao() {
      const token = localStorage.getItem('token')
      const expiry = Number(localStorage.getItem('tokenExpiresAt'))
      if (!token || !expiry || expiry <= Date.now()) {
        localStorage.removeItem('token')
        localStorage.removeItem('tokenExpiresAt')
        navigate('/Login')
        return
      }

      try {
        const response = await fetch(`http://${APIGERENCIADOR}/consultafuncoes/${encodeURIComponent(funcCod)}`, {
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
        if (!response.ok || !data.funcao) {
          throw new Error(data.message || 'Não foi possível carregar a função')
        }
        setDescricao(data.funcao.func_desc)
      } catch (error) {
        if (error.name !== 'AbortError') setErro(error.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    carregarFuncao()
    return () => controller.abort()
  }, [editing, funcCod, navigate])

  async function salvarFuncao(event) {
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
      const response = await fetch(
        editing
          ? `http://${APIGERENCIADOR}/consultafuncoes/${encodeURIComponent(funcCod)}`
          : `http://${APIGERENCIADOR}/cadastrarfuncao`,
        {
        method: editing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ func_desc: descricao.trim() })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || (editing ? 'Não foi possível atualizar a função' : 'Não foi possível cadastrar a função'))
      }

      if (onCreated) {
        onCreated(data.funcao)
      } else {
        window.alert(editing ? 'Função atualizada.' : `Função cadastrada com o código ${data.funcao.func_cod}.`)
        navigate('/ConsFuncoes')
      }
    } catch (error) {
      setErro(error.message)
    } finally {
      setSaving(false)
    }
  }

  const form = (
    <form className="cad-funcoes-form" onSubmit={salvarFuncao}>
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
          disabled={loading || saving}
        />
      </div>
      {editing && (
        <div className="cad-funcoes-field">
          <label htmlFor="funcao-codigo">Código</label>
          <input id="funcao-codigo" type="text" value={funcCod} readOnly />
        </div>
      )}
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
        <button className="cad-funcoes-action cad-funcoes-action--confirm" type="submit" disabled={saving || loading}>
          {loading ? 'Carregando...' : saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Incluir função'}
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
          <h1 id="cad-funcoes-title">{editing ? 'Editar função' : 'Função'}</h1>
        </header>
        {form}
      </section>
    </main>
  )
}

export default CadFuncoes
