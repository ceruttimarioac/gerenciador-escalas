import fastify from 'fastify'
import cors from '@fastify/cors'
import { ADDRESS_WEB, ADDRESS_API, PORT_API, KEY_FIREBASE_API } from './config-apigerenciador.js'

const app = fastify({ logger: false });
const API_REGISTRADOR_URL = process.env.API_REGISTRADOR_URL || 'http://127.0.0.1:3334';

async function obterUserId(token) {
  if (!token) return false;

  // Faz uma requisição para a API do Firebase para validar o token e obter o userId
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${KEY_FIREBASE_API}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token })
      }
    );
    const data = await response.json();
    return response.ok ? data.users?.[0]?.localId || false : false;
  } catch {
    return false;
  }
}

await app.register(cors, {
  origin: ADDRESS_WEB
})


app.post('/login', async (request) => {
  try {
    const { email, password } = request.body;

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY_FIREBASE_API}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          password: password,
          returnSecureToken: true
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error?.message
      };
    }

    return {
      success: true,
      token: data.idToken,
      expiresIn: data.expiresIn
    };

  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
});

app.post('/registrar', async (request, reply) => {
  try {

    const { email, password } = request.body;
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${KEY_FIREBASE_API}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          password: password,
          returnSecureToken: true
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      reply.code(response.status);
      return {
        success: false,
        message: data.error?.message
      };
    }

    return {
      success: true,
      token: data.idToken
    };

  } catch (error) {
    reply.code(500);
    return {
      success: false,
      message: error.message
    };
  }
});


app.get('/consultausuario', async (request, reply) => {
  
  // Recebe o token do cabeçalho Authorization
  const authorization = request.headers.authorization || '';
  
  // Remove o prefixo "Bearer " do token, se presente
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';

  // Se não houver token, retorna 401 Unauthorized
  try {
    const userId = await obterUserId(token);
    if (!userId) {
      reply.code(401);
      return { success: false, message: 'Sessão do usuario expirada' };
    }

    // Adiciona o userId como parâmetro de consulta para a API registradora
    const query = new URLSearchParams({
      //pega o texto pesquisado do query string e envia para a API registradora
      q: request.query.textopesquisado || '',
      userId
    });

    // Monta a requisição para a API registradora
    const registradorResponse = await fetch(
      `${API_REGISTRADOR_URL}/consultausuario?${query}`,
    );

    // Retorna a resposta da API registradora para o cliente
    const registradorData = await registradorResponse.json();
    
    // Define o status da resposta com base no status da API registradora
    reply.code(registradorResponse.status);

    // Retorna os dados da API registradora para o cliente
    return registradorData;
  } catch {
    reply.code(503);
    return {
      success: false,
      message: 'Não foi possível validar o token ou consultar a API registradora'
    };
  }
});





const start = async () => {
  try {
    await app.listen({ port: PORT_API, host: ADDRESS_API });
    console.log(`Server is running on port ${PORT_API}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();