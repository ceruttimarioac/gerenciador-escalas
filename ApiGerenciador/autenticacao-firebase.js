import { KEY_FIREBASE_API } from './config-apigerenciador.js'

// Consulta o Firebase usando o token e retorna o ID do usuário ou false.
export async function obterUserIdfirebase(token) {
  // Se o token não foi informado, encerra a função.
  if (!token) {
    return false;
  }

  try {
    // Endereço da API do Firebase que consulta o usuário pelo token.
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${KEY_FIREBASE_API}`;

    // Envia o token para o Firebase.
    const resposta = await fetch(url, {
      method: 'POST',

      // Informa que o corpo da requisição está no formato JSON.
      headers: {
        'Content-Type': 'application/json'
      },

      // Converte o objeto com o token para uma string JSON.
      body: JSON.stringify({
        idToken: token
      })
    });

    // Lê o conteúdo da resposta e converte para um objeto JavaScript.
    const dados = await resposta.json();

    if (!resposta.ok) {

      // Não foi possível obter um usuário válido.
      return false;
    }

    // Pega o primeiro usuário da lista.
    // O ?. evita um erro caso a propriedade "users" não exista.
    const usuario = dados.users?.[0];

    // Se nenhum usuário foi retornado, encerra a função.
    if (!usuario) {
      return false;
    }

    // O campo localId contém o identificador do usuário no Firebase.
    const userId = usuario.localId;

    // Retorna o identificador ou false se ele estiver ausente ou vazio.
    return userId || false;

  } catch {
    // Indica que não foi possível obter o identificador do usuário.
    return false;
  }
}
