const chaveConfiguracao = 'adminBootstrap'

export function salvarConfiguracao({ token, expiresIn, email }) {
  sessionStorage.setItem(chaveConfiguracao, JSON.stringify({
    token,
    expiracao: Date.now() + Number(expiresIn || 3600) * 1000,
    email
  }))
}

export function obterTokenAtivo() {
  return Number(localStorage.getItem('tokenExpiresAt')) > Date.now()
    ? localStorage.getItem('token')
    : null
}

export function obterConfiguracaoAtiva() {
  try {
    const dados = sessionStorage.getItem(chaveConfiguracao)
    const sessao = JSON.parse(dados)
    return sessao?.token && sessao.expiracao > Date.now() ? dados : null
  } catch {
    return null
  }
}

export function limparConfiguracao() {
  sessionStorage.removeItem(chaveConfiguracao)
}

export function encerrarSessao() {
  for (const chave of ['token', 'tokenExpiresAt', 'emp_id', 'user_cod']) {
    localStorage.removeItem(chave)
  }
  limparConfiguracao()
}
