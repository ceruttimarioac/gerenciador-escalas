import fastify from 'fastify'
import cors from '@fastify/cors'
import { ADDRESS_WEB, ADDRESS_API, PORT_API, KEY_FIREBASE_API, SAVE_LOG } from './config-apigerenciador.js'
import { createApiLogger } from '../apiLogger.js'

const app = fastify({ logger: false });
const log = createApiLogger(import.meta.url, 'ApiGerenciador', SAVE_LOG)
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
    if (!response.ok) {
      await log('warn', 'firebase_token_rejected', { statusCode: response.status })
      return false
    }
    return data.users?.[0]?.localId || false;
  } catch (error) {
    await log('error', 'firebase_validation_failed', { message: error.message })
    return false;
  }
}

async function consultarRegistrador(path, options) {
  const response = await fetch(`${API_REGISTRADOR_URL}${path}`, options)
  const data = await response.json()
  return { response, data }
}

async function obterUidAutenticado(request, reply) {
  const authorization = request.headers.authorization || ''
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : ''
  const userId = await obterUserId(token)

  if (!userId) {
    reply.code(401)
    return null
  }

  return userId
}

await app.register(cors, {
  origin: ADDRESS_WEB,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'OPTIONS']
})

app.addHook('onResponse', async (request, reply) => {
  await log('info', 'http_response', {
    method: request.method,
    route: request.routeOptions?.url || request.url.split('?')[0],
    statusCode: reply.statusCode,
    responseTimeMs: Math.round(request.elapsedTime * 100) / 100
  })
})


app.post('/login', async (request, reply) => {
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
      await log('warn', 'firebase_login_rejected', { statusCode: response.status })
      return {
        success: false,
        message: data.error?.message
      };
    }

    const query = new URLSearchParams({ userId: data.localId })
    const { response: contextResponse, data: userContext } = await consultarRegistrador(
      `/contextousuario?${query}`
    )

    if (!contextResponse.ok) {
      if (contextResponse.status === 404) {
        reply.code(404)
        return {
          success: false,
          code: 'USER_NOT_REGISTERED',
          message: 'Sua conta ainda não está vinculada a uma empresa',
          token: data.idToken,
          expiresIn: data.expiresIn,
          email: data.email || email
        }
      }
      reply.code(contextResponse.status === 404 ? 403 : 503)
      return {
        success: false,
        message: userContext.message || 'Não foi possível carregar os dados do usuário'
      }
    }

    return {
      success: true,
      token: data.idToken,
      expiresIn: data.expiresIn
    };

  } catch (error) {
    await log('error', 'login_failed', { message: error.message })
    return {
      success: false,
      message: error.message
    };
  }
});

app.get('/contexto', async (request, reply) => {
  try {
    const userId = await obterUidAutenticado(request, reply)
    if (!userId) return { success: false, message: 'Sessão do usuário expirada' }

    const query = new URLSearchParams({ userId })
    const { response, data } = await consultarRegistrador(`/contextousuario?${query}`)
    reply.code(response.status)
    return data
  } catch (error) {
    await log('error', 'company_context_failed', { message: error.message })
    reply.code(503)
    return { success: false, message: 'Não foi possível consultar a empresa do usuário' }
  }
})

app.post('/admin/empresa', async (request, reply) => {
  try {
    const userId = await obterUidAutenticado(request, reply)
    if (!userId) return { success: false, message: 'Sessão do usuário expirada' }

    const { emp_nome: empNome, emp_cnpj_cpf: empCnpjCpf, user_nome: userNome, func_desc: funcDesc } = request.body || {}
    const companyName = String(empNome || '').trim()
    const initialUserName = String(userNome || '').trim()
    const initialFunction = String(funcDesc || '').trim()
    if (!companyName || companyName.length > 120 || String(empCnpjCpf || '').length > 18 || !initialUserName || initialUserName.length > 120 || !initialFunction || initialFunction.length > 200) {
      reply.code(400)
      return { success: false, message: 'Informe empresa, nome do administrador e função inicial válidos' }
    }

    const { response, data } = await consultarRegistrador('/bootstrapempresa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        empNome: companyName,
        empCnpjCpf: String(empCnpjCpf || '').trim(),
        userNome: initialUserName,
        funcDesc: initialFunction
      })
    })
    reply.code(response.status)
    return data
  } catch (error) {
    await log('error', 'admin_company_bootstrap_failed', { message: error.message })
    reply.code(503)
    return { success: false, message: 'Não foi possível configurar a empresa' }
  }
})

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
      await log('warn', 'firebase_registration_rejected', { statusCode: response.status })
      reply.code(response.status);
      return {
        success: false,
        message: data.error?.message
      };
    }

    return {
      success: true,
      token: data.idToken,
      firebaseUid: data.localId
    };

  } catch (error) {
    await log('error', 'registration_failed', { message: error.message })
    reply.code(500);
    return {
      success: false,
      message: error.message
    };
  }
});


app.get('/consultafuncoes', async (request, reply) => {
  try {
    const userId = await obterUidAutenticado(request, reply)
    if (!userId) return { success: false, message: 'Sessão do usuário expirada' }

    const query = new URLSearchParams({
      userId,
      q: request.query.q || ''
    })
    const { response, data } = await consultarRegistrador(`/consultafuncoes?${query}`)
    reply.code(response.status)
    return data
  } catch (error) {
    await log('error', 'consultafuncoes_failed', { message: error.message })
    reply.code(503)
    return { success: false, message: 'Não foi possível consultar as funções' }
  }
})

app.post('/cadastrarfuncao', async (request, reply) => {
  try {
    const userId = await obterUidAutenticado(request, reply)
    if (!userId) return { success: false, message: 'Sessão do usuário expirada' }

    const { func_desc: funcDesc } = request.body || {}
    if (!String(funcDesc || '').trim()) {
      reply.code(400)
      return { success: false, message: 'Informe a descrição da função' }
    }

    const { response, data } = await consultarRegistrador('/cadastrarfuncao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, func_desc: String(funcDesc).trim() })
    })
    reply.code(response.status)
    return data
  } catch (error) {
    await log('error', 'cadastrarfuncao_failed', { message: error.message })
    reply.code(503)
    return { success: false, message: 'Não foi possível cadastrar a função' }
  }
})

app.post('/cadastrarusuario', async (request, reply) => {
  const userId = await obterUidAutenticado(request, reply)
  if (!userId) return { success: false, message: 'Sessão do usuário expirada' }

  const { nome, email, password, func_cod: funcCod } = request.body || {}
  const userNome = String(nome || '').trim()
  const userEmail = typeof email === 'string' ? email.trim() : ''
  const functionCode = Number(funcCod)
  if (!userNome || userNome.length > 120 || !userEmail || userEmail.length > 254 || typeof password !== 'string' || password.length < 6 || !Number.isInteger(functionCode) || functionCode < 1) {
    reply.code(400)
    return { success: false, message: 'Informe nome, email, senha e uma função válida' }
  }

  try {
    const contextQuery = new URLSearchParams({ userId })
    const { response: contextResponse, data: userContext } = await consultarRegistrador(
      `/contextousuario?${contextQuery}`
    )
    if (!contextResponse.ok) {
      reply.code(contextResponse.status)
      return userContext
    }

    const firebaseResponse = await app.inject({
      method: 'POST',
      url: '/registrar',
      payload: { email: userEmail, password }
    })
    const firebaseData = firebaseResponse.json()
    if (firebaseResponse.statusCode >= 400 || !firebaseData.success) {
      reply.code(firebaseResponse.statusCode)
      return firebaseData
    }

    const registration = await consultarRegistrador('/cadastrarusuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        firebaseUid: firebaseData.firebaseUid,
        userNome,
        funcCod: functionCode
      })
    })

    if (!registration.response.ok) {
      await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${KEY_FIREBASE_API}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: firebaseData.token })
        }
      )
      reply.code(registration.response.status)
      return registration.data
    }

    return { success: true, ...registration.data }
  } catch (error) {
    await log('error', 'cadastrarusuario_failed', { message: error.message })
    reply.code(503)
    return { success: false, message: 'Não foi possível cadastrar o usuário' }
  }
})


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
      await log('warn', 'consultausuario_unauthorized')
      reply.code(401);
      return { success: false, message: 'Sessão do usuario expirada' };
    }

    // Adiciona o userId como parâmetro de consulta para a API registradora
    const query = new URLSearchParams({
      q: request.query.q || request.query.textopesquisado || '',
      userId
    });

    // Monta a requisição para a API registradora
    const registradorResponse = await fetch(
      `${API_REGISTRADOR_URL}/consultausuario?${query}`,
    );
    await log(registradorResponse.ok ? 'info' : 'warn', 'registrador_response', {
      statusCode: registradorResponse.status
    })

    // Retorna a resposta da API registradora para o cliente
    const registradorData = await registradorResponse.json();
    
    // Define o status da resposta com base no status da API registradora
    reply.code(registradorResponse.status);

    // Retorna os dados da API registradora para o cliente
    return registradorData;
  } catch (error) {
    await log('error', 'consultausuario_failed', { message: error.message })
    reply.code(503);
    return {
      success: false,
      message: 'Não foi possível validar o token ou consultar a API registradora'
    };
  }
});

app.get('/consultausuario/:userCod', async (request, reply) => {
  try {
    const userId = await obterUidAutenticado(request, reply)
    if (!userId) return { success: false, message: 'Sessão do usuário expirada' }

    const userCod = Number(request.params.userCod)
    if (!Number.isInteger(userCod) || userCod < 1) {
      reply.code(400)
      return { success: false, message: 'Código de usuário inválido' }
    }

    const query = new URLSearchParams({ userId })
    const { response, data } = await consultarRegistrador(
      `/consultausuario/${userCod}?${query}`
    )
    reply.code(response.status)
    return data
  } catch (error) {
    await log('error', 'user_details_failed', { message: error.message })
    reply.code(503)
    return { success: false, message: 'Não foi possível consultar o colaborador' }
  }
})

app.put('/consultausuario/:userCod', async (request, reply) => {
  try {
    const userId = await obterUidAutenticado(request, reply)
    if (!userId) return { success: false, message: 'Sessão do usuário expirada' }

    const userCod = Number(request.params.userCod)
    const userNome = String(request.body?.user_nome || '').trim()
    const functionCode = Number(request.body?.func_cod)
    if (!Number.isInteger(userCod) || userCod < 1 || !userNome || userNome.length > 120 || !Number.isInteger(functionCode) || functionCode < 1) {
      reply.code(400)
      return { success: false, message: 'Informe nome e função válidos' }
    }

    const { response, data } = await consultarRegistrador(`/atualizarusuario/${userCod}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        userNome,
        funcCod: functionCode,
        indisponibilidades: request.body.indisponibilidades
      })
    })
    reply.code(response.status)
    return data
  } catch (error) {
    await log('error', 'user_update_failed', { message: error.message })
    reply.code(503)
    return { success: false, message: 'Não foi possível atualizar o colaborador' }
  }
})





const start = async () => {
  try {
    await app.listen({ port: PORT_API, host: ADDRESS_API });
    await log('info', 'api_started', { host: ADDRESS_API, port: PORT_API })
    console.log(`Server is running on port ${PORT_API}`);
  } catch (err) {
    await log('error', 'api_start_failed', { message: err.message })
    app.log.error(err);
    process.exit(1);
  }
};

start();