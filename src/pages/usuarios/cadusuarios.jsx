import { useEffect, useEffectEvent, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { APIGERENCIADOR } from '../../config-web'
import CadFuncoes from '../funcoes/cadfuncoes.jsx'
import './cadusuarios.css'

const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatarDataCalendario(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function criarDiasDoMes(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
  ]
}

function CadUsuarios() {
  const { userCod } = useParams()
  const location = useLocation()
  const selectedUser = location.state?.usuario
  const editing = Boolean(userCod)
  const [nome, setNome] = useState(selectedUser?.user_nome || '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [codigo, setCodigo] = useState(selectedUser?.user_cod || userCod || '')
  const hasCodigo = Boolean(String(codigo).trim())
  const [indisponibilidades, setIndisponibilidades] = useState([])
  const [showAvailabilityCalendar, setShowAvailabilityCalendar] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [funcao, setFuncao] = useState(null)
  const [funcoes, setFuncoes] = useState([])
  const [pesquisaFuncao, setPesquisaFuncao] = useState('')
  const [showFunctionPicker, setShowFunctionPicker] = useState(false)
  const [showFunctionCreate, setShowFunctionCreate] = useState(false)
  const [loadingFunctions, setLoadingFunctions] = useState(false)
  const [loadingUser, setLoadingUser] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [erroFuncoes, setErroFuncoes] = useState('')
  const navigate = useNavigate()

  const carregarUsuario = useEffectEvent(async () => {
    const token = localStorage.getItem('token')
    const expiry = Number(localStorage.getItem('tokenExpiresAt'))
    if (!token || !expiry || expiry <= Date.now()) {
      localStorage.removeItem('token')
      localStorage.removeItem('tokenExpiresAt')
      navigate('/Login')
      return
    }

    try {
      const response = await fetch(
        `http://${APIGERENCIADOR}/consultausuario/${encodeURIComponent(userCod)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const data = await response.json()
      if (!response.ok || !data.usuario) {
        throw new Error(data.message || 'Não foi possível carregar o colaborador')
      }
      setNome(data.usuario.user_nome)
      setCodigo(data.usuario.user_cod)
      setIndisponibilidades(data.indisponibilidades || [])
      if (data.usuario.func_cod) {
        setFuncao({ func_cod: data.usuario.func_cod, func_desc: data.usuario.func_desc || '' })
      }
    } catch (error) {
      setErro(error.message)
    } finally {
      setLoadingUser(false)
    }
  })

  useEffect(() => {
    if (!editing) return undefined
    const timeoutId = window.setTimeout(() => carregarUsuario(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [editing, userCod])

  async function consultarFuncoes(pesquisa = '') {
    setLoadingFunctions(true)
    setErroFuncoes('')
    try {
      const query = new URLSearchParams({ q: pesquisa })
      const response = await fetch(`http://${APIGERENCIADOR}/consultafuncoes?${query}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (!response.ok || !Array.isArray(data.funcoes)) {
        throw new Error(data.message || 'Não foi possível consultar funções')
      }
      setFuncoes(data.funcoes)
    } catch (error) {
      setErroFuncoes(error.message)
      setFuncoes([])
    } finally {
      setLoadingFunctions(false)
    }
  }

  async function salvarUsuario(event) {
    event.preventDefault()
    setErro('')
    if (!funcao) {
      setErro('Selecione uma função para o colaborador')
      return
    }

    const token = localStorage.getItem('token')
    const expiry = Number(localStorage.getItem('tokenExpiresAt'))
    if (!token || !expiry || expiry <= Date.now()) {
      localStorage.removeItem('token')
      localStorage.removeItem('tokenExpiresAt')
      navigate('/Login')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(
        hasCodigo
          ? `http://${APIGERENCIADOR}/consultausuario/${encodeURIComponent(codigo)}`
          : `http://${APIGERENCIADOR}/cadastrarusuario`,
        {
        method: hasCodigo ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(hasCodigo
          ? { user_nome: nome.trim(), func_cod: funcao.func_cod, indisponibilidades }
          : { nome: nome.trim(), email: email.trim(), password, func_cod: funcao.func_cod })
        },
      )
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || (hasCodigo ? 'Não foi possível atualizar o colaborador' : 'Não foi possível cadastrar o colaborador'))
      }
      setPassword('')
      window.alert(hasCodigo ? 'Colaborador atualizado.' : `Colaborador cadastrado com o código ${data.usuario.user_cod}.`)
      navigate('/ConsUsuarios')
    } catch (error) {
      setErro(error.message)
    } finally {
      setSaving(false)
    }
  }

  function alternarIndisponibilidade(date) {
    setIndisponibilidades((current) => current.includes(date)
      ? current.filter((item) => item !== date)
      : [...current, date].sort())
  }

  const diasDoMes = criarDiasDoMes(calendarMonth)
  const selectedDatesLabel = indisponibilidades.length
    ? `${indisponibilidades.length} dia(s) selecionado(s)`
    : 'Nenhum dia selecionado'

  return (
    <main className="cad-usuarios-page">
      <section className="cad-usuarios-content" aria-labelledby="cad-usuarios-title">
        <header className="cad-usuarios-header">
          <p>CADASTRO</p>
          <h1 id="cad-usuarios-title">{hasCodigo ? 'Editar colaborador' : 'Colaborador'}</h1>
        </header>

        <form className="cad-usuarios-form" onSubmit={salvarUsuario}>
          <div className="cad-usuarios-field">
            <label htmlFor="usuario-nome">Nome</label>
            <input id="usuario-nome" type="text" autoComplete="name" maxLength={120} value={nome} onChange={(event) => setNome(event.target.value)} required disabled={loadingUser} />
          </div>
          <div className="cad-usuarios-field">
            <label htmlFor="usuario-codigo">Código</label>
            <input id="usuario-codigo" type="text" value={codigo} placeholder="Gerado automaticamente pelo banco" readOnly />
          </div>
          {hasCodigo ? (
            <p className="cad-usuarios-field-hint cad-usuarios-field--wide">Email e senha são gerenciados pela conta Firebase e não podem ser alterados aqui.</p>
          ) : (
            <>
              <div className="cad-usuarios-field">
                <label htmlFor="usuario-email">Email</label>
                <input id="usuario-email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <div className="cad-usuarios-field">
                <label htmlFor="usuario-senha">Senha</label>
                <input id="usuario-senha" type="password" autoComplete="new-password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
            </>
          )}
          {hasCodigo && (
            <div className="cad-usuarios-field cad-usuarios-field--wide">
              <label htmlFor="usuario-indisponibilidades">Dias indisponíveis</label>
              <button
                id="usuario-indisponibilidades"
                className="cad-usuarios-function-picker"
                type="button"
                onClick={() => setShowAvailabilityCalendar(true)}
                disabled={loadingUser}
                aria-haspopup="dialog"
              >
                {selectedDatesLabel}
              </button>
            </div>
          )}
          <div className="cad-usuarios-field cad-usuarios-field--wide">
            <label htmlFor="usuario-funcao">Função</label>
            <button
              id="usuario-funcao"
              className="cad-usuarios-function-picker"
              type="button"
              onClick={() => {
                setPesquisaFuncao('')
                setShowFunctionPicker(true)
                consultarFuncoes()
              }}
              aria-haspopup="dialog"
              aria-expanded={showFunctionPicker}
              disabled={loadingUser}
            >
              {funcao ? `${funcao.func_cod} - ${funcao.func_desc}` : 'Selecionar função'}
            </button>
          </div>
          {erro && <p className="cad-usuarios-error" role="alert">{erro}</p>}
          <div className="cad-usuarios-form-actions">
            <Link className="cad-usuarios-action cad-usuarios-action--back" to="/ConsUsuarios">Voltar</Link>
            <button className="cad-usuarios-action cad-usuarios-action--confirm" type="submit" disabled={saving || loadingUser}>
              {saving ? (codigo ? 'Confirmando...' : 'Incluindo...') : (codigo ? 'Confirmar' : 'Incluir')}
            </button>
          </div>
        </form>
      </section>

      {showFunctionPicker && (
        <div className="cad-usuarios-overlay">
          <section className="cad-usuarios-dialog" role="dialog" aria-modal="true" aria-labelledby="selecao-funcao-title">
            <header className="cad-usuarios-dialog__header">
              <div><p>VÍNCULO</p><h2 id="selecao-funcao-title">Selecionar função</h2></div>
              <button className="cad-usuarios-dialog__close" type="button" onClick={() => setShowFunctionPicker(false)} aria-label="Fechar seleção de função">×</button>
            </header>
            <label className="cad-usuarios-field" htmlFor="pesquisa-funcao">
              <span>Filtrar por código ou descrição</span>
              <input id="pesquisa-funcao" type="search" value={pesquisaFuncao} onChange={(event) => { setPesquisaFuncao(event.target.value); consultarFuncoes(event.target.value) }} />
            </label>
            <div className="cad-usuarios-function-list" aria-live="polite">
              {loadingFunctions ? <p>Consultando funções...</p> : erroFuncoes ? <p className="cad-usuarios-error" role="alert">{erroFuncoes}</p> : funcoes.length ? funcoes.map((item) => (
                <button className="cad-usuarios-function-option" type="button" key={item.func_cod} onClick={() => { setFuncao(item); setShowFunctionPicker(false) }}>
                  <strong>{item.func_cod}</strong><span>{item.func_desc}</span>
                </button>
              )) : <p>Nenhuma função encontrada para esta empresa.</p>}
            </div>
            <button className="cad-usuarios-new-function" type="button" onClick={() => setShowFunctionCreate(true)}>Cadastrar função</button>
          </section>
          {showFunctionCreate && (
            <CadFuncoes
              embedded
              onCancel={() => setShowFunctionCreate(false)}
              onCreated={(createdFunction) => { setFuncao(createdFunction); setShowFunctionCreate(false); setShowFunctionPicker(false) }}
            />
          )}
        </div>
      )}

      {showAvailabilityCalendar && hasCodigo && (
        <div className="cad-usuarios-overlay">
          <section className="cad-usuarios-calendar-dialog" role="dialog" aria-modal="true" aria-labelledby="indisponibilidade-title">
            <header className="cad-usuarios-dialog__header">
              <div>
                <p>INDISPONIBILIDADE</p>
                <h2 id="indisponibilidade-title">Selecionar dias</h2>
              </div>
              <button className="cad-usuarios-dialog__close" type="button" onClick={() => setShowAvailabilityCalendar(false)} aria-label="Fechar calendário">×</button>
            </header>
            <div className="cad-usuarios-calendar-month">
              <button
                className="cad-usuarios-calendar-nav"
                type="button"
                aria-label="Mês anterior"
                onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              >
                ‹
              </button>
              <h3>{calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
              <button
                className="cad-usuarios-calendar-nav"
                type="button"
                aria-label="Próximo mês"
                onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              >
                ›
              </button>
            </div>
            <div className="cad-usuarios-calendar-grid" aria-label="Calendário de indisponibilidades">
              {diasDaSemana.map((dayName) => <span className="cad-usuarios-calendar-weekday" key={dayName}>{dayName}</span>)}
              {diasDoMes.map((day, index) => {
                if (!day) return <span className="cad-usuarios-calendar-empty" key={`empty-${index}`} />
                const date = formatarDataCalendario(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day))
                const selected = indisponibilidades.includes(date)
                return (
                  <button
                    className={`cad-usuarios-calendar-day${selected ? ' cad-usuarios-calendar-day--selected' : ''}`}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${day} ${calendarMonth.toLocaleDateString('pt-BR', { month: 'long' })}${selected ? ', indisponível' : ''}`}
                    key={date}
                    onClick={() => alternarIndisponibilidade(date)}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            <p className="cad-usuarios-calendar-selection">
              {indisponibilidades.length
                ? `Selecionados: ${indisponibilidades.map((date) => new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR')).join(', ')}`
                : 'Nenhum dia selecionado'}
            </p>
            <button className="cad-usuarios-calendar-done" type="button" onClick={() => setShowAvailabilityCalendar(false)}>Concluir seleção</button>
          </section>
        </div>
      )}
    </main>
  )
}

export default CadUsuarios