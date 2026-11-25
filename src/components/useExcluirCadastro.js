import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APIGERENCIADOR } from '../config-web'
import { useFeedback } from './feedback-context.js'

export function useExcluirCadastro({ codigo, caminho, consulta, registro, rotulo, detalhes = '' }) {
  const [excluindo, setExcluindo] = useState(false)
  const navigate = useNavigate()
  const { confirmFeedback, showFeedback } = useFeedback()

  async function excluir() {
    setExcluindo(true)
    try {
      const confirmado = await confirmFeedback(
        `Excluir ${registro} de código ${codigo}? ${detalhes}Essa ação não pode ser desfeita.`,
        { title: 'Confirmar exclusão', confirmLabel: rotulo }
      )
      if (!confirmado) return

      const token = localStorage.getItem('token')
      const expiry = Number(localStorage.getItem('tokenExpiresAt'))
      const response = token && expiry > Date.now()
        ? await fetch(`http://${APIGERENCIADOR}/${caminho}/${encodeURIComponent(codigo)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
        : null

      if (!response || response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('tokenExpiresAt')
        showFeedback('Sua sessão expirou. Entre novamente para continuar.', {
          title: 'Sessão expirada',
          tone: 'error',
          onOk: () => navigate('/Login')
        })
        return
      }

      const data = await response.json()
      if (!response.ok || !data.success) {
        showFeedback(data.message || 'O cadastro não pôde ser excluído.', {
          title: `Não foi possível excluir ${registro}`,
          tone: 'error'
        })
        return
      }

      showFeedback(data.message, {
        title: 'Exclusão concluída',
        tone: 'success',
        onOk: () => navigate(consulta, { replace: true })
      })
    } catch {
      showFeedback(`Não foi possível confirmar a exclusão. Verifique se ${registro} ainda aparece na consulta.`, {
        title: `Não foi possível excluir ${registro}`,
        tone: 'error'
      })
    } finally {
      setExcluindo(false)
    }
  }

  return { excluir, excluindo }
}
