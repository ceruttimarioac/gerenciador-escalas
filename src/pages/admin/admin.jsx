import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { APIGERENCIADOR } from '../../config-web'
import './admin.css'

function Admin() {
  const location = useLocation()
  const navigate = useNavigate()
  const setupToken = location.state?.adminBootstrap ? location.state.token : ''
  const expiresIn = Number(location.state?.expiresIn || 3600)
  const accountEmail = location.state?.email || ''
  const hasBootstrapAccess = Boolean(setupToken)

  const [companyName, setCompanyName] = useState('')
  const [companyDocument, setCompanyDocument] = useState('')
  const [initialUserName, setInitialUserName] = useState('')
  const [initialFunction, setInitialFunction] = useState('Administrador')
  const [company, setCompany] = useState(null)
  const [functions, setFunctions] = useState([])
  const [functionDescription, setFunctionDescription] = useState('')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [functionCode, setFunctionCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!hasBootstrapAccess) navigate('/Login', { replace: true })
  }, [hasBootstrapAccess, navigate])

  useEffect(() => {
    if (!hasBootstrapAccess) return

    let active = true
    async function loadCompanyContext() {
      try {
        const headers = { Authorization: `Bearer ${setupToken}` }
        const response = await fetch(`http://${APIGERENCIADOR}/contexto`, { headers })
        if (!response.ok) return
        const data = await response.json()
        if (!active) return

        setCompany(data)
        const functionsResponse = await fetch(`http://${APIGERENCIADOR}/consultafuncoes`, { headers })
        if (!functionsResponse.ok) return
        const functionData = await functionsResponse.json()
        if (active && Array.isArray(functionData.funcoes)) setFunctions(functionData.funcoes)
      } catch {}
    }

    loadCompanyContext()
    return () => {
      active = false
    }
  }, [hasBootstrapAccess, setupToken])

  async function submitInitialSetup(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`http://${APIGERENCIADOR}/admin/empresa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${setupToken}`
        },
        body: JSON.stringify({
          emp_nome: companyName.trim(),
          emp_cnpj_cpf: companyDocument.trim(),
          user_nome: initialUserName.trim(),
          func_desc: initialFunction.trim()
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Não foi possível configurar a empresa')
      }
      setCompany(data.empresa)
      setFunctions([data.funcao])
      setFunctionCode(String(data.funcao.func_cod))
      setNotice('Empresa, usuário administrador e função inicial cadastrados.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function submitFunction(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`http://${APIGERENCIADOR}/cadastrarfuncao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${setupToken}`
        },
        body: JSON.stringify({ func_desc: functionDescription.trim() })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Não foi possível cadastrar a função')
      }
      setFunctions((current) => [...current, data.funcao])
      setFunctionCode(String(data.funcao.func_cod))
      setFunctionDescription('')
      setNotice(`Função ${data.funcao.func_cod} cadastrada.`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function submitUser(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`http://${APIGERENCIADOR}/cadastrarusuario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${setupToken}`
        },
        body: JSON.stringify({
          nome: userName.trim(),
          email: userEmail.trim(),
          password: userPassword,
          func_cod: Number(functionCode)
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Não foi possível cadastrar o usuário')
      }
      setUserName('')
      setUserEmail('')
      setUserPassword('')
      setNotice(`Usuário ${data.usuario.user_cod} cadastrado.`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  function goToHome() {
    localStorage.setItem('token', setupToken)
    localStorage.setItem('tokenExpiresAt', String(Date.now() + expiresIn * 1000))
    localStorage.removeItem('emp_id')
    localStorage.removeItem('user_cod')
    navigate('/Home', { replace: true })
  }

  if (!hasBootstrapAccess) return null

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p>CONFIGURAÇÃO INICIAL</p>
          <h1>Administração</h1>
        </div>
        {company && <button className="admin-home-button" type="button" onClick={goToHome}>Ir para Home</button>}
      </header>

      {error && <p className="admin-message admin-message--error" role="alert">{error}</p>}
      {notice && <p className="admin-message admin-message--success" role="status">{notice}</p>}

      {!company ? (
        <section className="admin-section" aria-labelledby="admin-company-title">
          <header className="admin-section__header">
            <h2 id="admin-company-title">Empresa e primeiro acesso</h2>
            <p>O acesso autenticado será associado ao usuário administrador da empresa.</p>
          </header>
          <form className="admin-form" onSubmit={submitInitialSetup}>
            <div className="admin-field">
              <label htmlFor="admin-company-name">Nome da empresa</label>
              <input id="admin-company-name" type="text" maxLength={120} value={companyName} onChange={(event) => setCompanyName(event.target.value)} required />
            </div>
            <div className="admin-field">
              <label htmlFor="admin-company-document">CNPJ/CPF</label>
              <input id="admin-company-document" type="text" maxLength={18} value={companyDocument} onChange={(event) => setCompanyDocument(event.target.value)} />
            </div>
            <div className="admin-field">
              <label htmlFor="admin-owner-name">Nome do administrador</label>
              <input id="admin-owner-name" type="text" autoComplete="name" maxLength={120} value={initialUserName} onChange={(event) => setInitialUserName(event.target.value)} required />
            </div>
            <div className="admin-field">
              <label htmlFor="admin-owner-email">Email da conta autenticada</label>
              <input id="admin-owner-email" type="email" value={accountEmail} readOnly />
            </div>
            <div className="admin-field admin-field--wide">
              <label htmlFor="admin-first-function">Função inicial</label>
              <input id="admin-first-function" type="text" maxLength={200} value={initialFunction} onChange={(event) => setInitialFunction(event.target.value)} required />
            </div>
            <div className="admin-form-actions">
              <Link className="admin-secondary-button" to="/Login">Voltar ao login</Link>
              <button className="admin-primary-button" type="submit" disabled={saving}>
                {saving ? 'Cadastrando...' : 'Cadastrar empresa e administrador'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <section className="admin-section" aria-labelledby="admin-company-summary-title">
            <header className="admin-section__header">
              <h2 id="admin-company-summary-title">Empresa cadastrada</h2>
            </header>
            <dl className="admin-company-summary">
              <div><dt>Nome</dt><dd>{company.emp_nome}</dd></div>
              <div><dt>CNPJ/CPF</dt><dd>{company.emp_cnpj_cpf || 'Não informado'}</dd></div>
              <div><dt>Código da empresa</dt><dd>{company.emp_id}</dd></div>
              <div><dt>Conta vinculada</dt><dd>{accountEmail}</dd></div>
            </dl>
          </section>

          <section className="admin-section" aria-labelledby="admin-functions-title">
            <header className="admin-section__header">
              <h2 id="admin-functions-title">Funções</h2>
            </header>
            <ul className="admin-function-list">
              {functions.map((item) => <li key={item.func_cod}><strong>{item.func_cod}</strong><span>{item.func_desc}</span></li>)}
            </ul>
            <form className="admin-form admin-form--single" onSubmit={submitFunction}>
              <div className="admin-field">
                <label htmlFor="admin-function-description">Descrição da função</label>
                <input id="admin-function-description" type="text" maxLength={200} value={functionDescription} onChange={(event) => setFunctionDescription(event.target.value)} required />
              </div>
              <div className="admin-form-actions">
                <button className="admin-primary-button" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Cadastrar função'}</button>
              </div>
            </form>
          </section>

          <section className="admin-section" aria-labelledby="admin-user-title">
            <header className="admin-section__header">
              <h2 id="admin-user-title">Novo usuário</h2>
            </header>
            <form className="admin-form" onSubmit={submitUser}>
              <div className="admin-field">
                <label htmlFor="admin-user-name">Nome</label>
                <input id="admin-user-name" type="text" autoComplete="name" maxLength={120} value={userName} onChange={(event) => setUserName(event.target.value)} required />
              </div>
              <div className="admin-field">
                <label htmlFor="admin-user-code">Código</label>
                <input id="admin-user-code" type="text" value="" placeholder="Gerado pelo banco" readOnly />
              </div>
              <div className="admin-field">
                <label htmlFor="admin-user-email">Email</label>
                <input id="admin-user-email" type="email" autoComplete="email" maxLength={254} value={userEmail} onChange={(event) => setUserEmail(event.target.value)} required />
              </div>
              <div className="admin-field">
                <label htmlFor="admin-user-password">Senha</label>
                <input id="admin-user-password" type="password" autoComplete="new-password" minLength={6} value={userPassword} onChange={(event) => setUserPassword(event.target.value)} required />
              </div>
              <div className="admin-field admin-field--wide">
                <label htmlFor="admin-user-function">Função</label>
                <select id="admin-user-function" value={functionCode} onChange={(event) => setFunctionCode(event.target.value)} required>
                  <option value="" disabled>Selecione uma função</option>
                  {functions.map((item) => <option key={item.func_cod} value={item.func_cod}>{item.func_cod} - {item.func_desc}</option>)}
                </select>
              </div>
              <div className="admin-form-actions">
                <button className="admin-primary-button" type="submit" disabled={saving || !functions.length}>{saving ? 'Incluindo...' : 'Incluir usuário'}</button>
              </div>
            </form>
          </section>
        </>
      )}
    </main>
  )
}

export default Admin
