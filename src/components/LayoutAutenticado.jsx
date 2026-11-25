import { useSyncExternalStore } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { obterConfiguracaoAtiva, obterTokenAtivo } from './sessao.js'
import './LayoutAutenticado.css'

function acompanharSessao(atualizar) {
  window.addEventListener('storage', atualizar)
  window.addEventListener('pageshow', atualizar)
  return () => {
    window.removeEventListener('storage', atualizar)
    window.removeEventListener('pageshow', atualizar)
  }
}

export default function LayoutAutenticado({ configuracao = false }) {
  const sessao = useSyncExternalStore(
    acompanharSessao,
    configuracao ? obterConfiguracaoAtiva : obterTokenAtivo
  )
  if (!sessao) return <Navigate to="/Login" replace />

  return (
    <div className="layout-autenticado">
      <Outlet context={configuracao ? JSON.parse(sessao) : null} />
    </div>
  )
}
