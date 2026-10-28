import fastify from 'fastify'
import cors from '@fastify/cors'
import { ADDRESS_WEB, ADDRESS_API, PORT_API, ADDRESS_APIGERENCIADOR, ADDRESS_APIIA, KEY_FIREBASE_API, SAVE_LOG } from './config-apigerenciador.js'
import { createApiLogger } from '../apiLogger.js'
import { loadEnvFile } from 'node:process'
loadEnvFile()

const app = fastify({ logger: false });
const log = createApiLogger(import.meta.url, 'ApiGerenciador', SAVE_LOG)
const API_REGISTRADOR_URL = process.env.API_REGISTRADOR_URL || `http://${ADDRESS_APIGERENCIADOR}`;
const API_IA_URL = process.env.API_IA_URL || `http://${ADDRESS_APIIA}`;

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





app.get('/consultarusuariosdisponiveis', async (request, reply) => {
  try {
    const userId = await obterUidAutenticado(request, reply);

    if (!userId) {
      return {
        success: false,
        message: 'Sessão do usuário expirada'
      };
    }

    const { funcCod, data } = request.query || {};

    const query = new URLSearchParams({
      userId,
      funcCod: String(funcCod || ''),
      data: String(data || '')
    });

    const { response, data: resultado } =
      await consultarRegistrador(
        `/consultarusuariosdisponiveis?${query}`
      );

    reply.code(response.status);
    return resultado;

  } catch (error) {
    await log('error', 'consultar_usuarios_disponiveis_failed', {
      message: error.message
    });

    reply.code(503);
    return {
      success: false,
      message: 'Não foi possível consultar os colaboradores disponíveis'
    };
  }
});


app.post('/inseriescalas', async (request, reply) => {
  try {
    const userId = await obterUidAutenticado(request, reply)

    if (!userId) {
      return {
        success: false,
        message: 'Sessão do usuário expirada'
      }
    }

    const { data, periodo, itens } = request.body || {}

    if (
      !data ||
      !['M', 'T', 'N'].includes(periodo) ||
      !Array.isArray(itens) ||
      itens.length === 0 ||
      itens.length > 30
    ) {
      reply.code(400)
      return {
        success: false,
        message: 'Informe data, período e até 30 colaboradores.'
      }
    }

    const itensFormatados = itens.map((item) => ({
      cod_user_func: Number(item.cod_user_func)
    }))

    if (
      itensFormatados.some(
        (item) =>
          !Number.isSafeInteger(item.cod_user_func) ||
          item.cod_user_func < 1
      )
    ) {
      reply.code(400)
      return {
        success: false,
        message: 'Selecione um colaborador válido para cada função.'
      }
    }

    const { response, data: resultado } = await consultarRegistrador(
      '/inseriescalas',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          data,
          periodo,
          itens: itensFormatados
        })
      }
    )

    reply.code(response.status)
    return resultado

  } catch (error) {
    await log('error', 'inseriescalas_failed', {
      message: error.message
    })

    reply.code(503)

    return {
      success: false,
      message: 'Não foi possível cadastrar a escala.'
    }
  }
})


app.get('/consultarescala/:escCod', async (request, reply) => {
  try {
    const userId = await obterUidAutenticado(request, reply)

    if (!userId) {
      return {
        success: false,
        message: 'Sessão do usuário expirada'
      }
    }

    const escCod = Number(request.params.escCod)

    if (!Number.isSafeInteger(escCod) || escCod < 1) {
      reply.code(400)
      return {
        success: false,
        message: 'Informe um código de escala válido.'
      }
    }

    const { response, data } = await consultarRegistrador(
      `/consultarescala/${escCod}?userId=${encodeURIComponent(userId)}`
    )

    reply.code(response.status)
    return data
  } catch (error) {
    await log('error', 'consultarescala_failed', {
      message: error.message
    })

    reply.code(503)
    return {
      success: false,
      message: 'Não foi possível consultar a escala.'
    }
  }
})


app.put('/atualizaescalas/:escCod', async (request, reply) => {
  try {
    const userId = await obterUidAutenticado(request, reply)

    if (!userId) {
      return {
        success: false,
        message: 'Sessão do usuário expirada'
      }
    }

    const escCod = Number(request.params.escCod)
    const { data, periodo, itens } = request.body || {}

    if (!Number.isSafeInteger(escCod) || escCod < 1) {
      reply.code(400)
      return {
        success: false,
        message: 'Informe um código de escala válido.'
      }
    }

    if (
      !data ||
      !['M', 'T', 'N'].includes(periodo) ||
      !Array.isArray(itens) ||
      itens.length < 1 ||
      itens.length > 30
    ) {
      reply.code(400)
      return {
        success: false,
        message: 'Informe data, período e até 30 colaboradores.'
      }
    }

    const itensFormatados = itens.map((item) => ({
      cod_user_func: Number(item?.cod_user_func)
    }))

    if (
      itensFormatados.some(
        (item) =>
          !Number.isSafeInteger(item.cod_user_func) ||
          item.cod_user_func < 1
      )
    ) {
      reply.code(400)
      return {
        success: false,
        message: 'Selecione um colaborador válido para cada função.'
      }
    }

    const { response, data: resultado } = await consultarRegistrador(
      `/atualizaescalas/${escCod}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          data,
          periodo,
          itens: itensFormatados
        })
      }
    )

    reply.code(response.status)
    return resultado
  } catch (error) {
    await log('error', 'atualizaescalas_failed', {
      message: error.message
    })

    reply.code(503)
    return {
      success: false,
      message: 'Não foi possível atualizar a escala.'
    }
  }
})



app.post('/geraescalaia', async (request, reply) => {
  try {
    const userId = await obterUidAutenticado(request, reply)
    if (!userId) {
      reply.code(401)
      return { success: false, message: 'Sessão expirada.' }
    }

    const {
      escalas,
      usuariosExcluidos = [],
      atribuicoesFixas = []
    } = request.body || {}

    if (!Array.isArray(escalas) || escalas.length === 0 ||
        !Array.isArray(usuariosExcluidos) || !Array.isArray(atribuicoesFixas)) {
      reply.code(400)
      return { success: false, message: 'Dados de geração inválidos.' }
    }

    const excluidos = new Set()
    for (const codigo of usuariosExcluidos) {
      if (!Number.isSafeInteger(codigo) || codigo < 1) {
        reply.code(400)
        return { success: false, message: 'Colaborador excluído inválido.' }
      }
      excluidos.add(codigo)
    }

    const datas = new Set()
    const tarefas = []

    for (const escala of escalas) {
      const { data, periodo, funcoes } = escala || {}
      const dataObj = new Date(`${data}T00:00:00Z`)
      const dataValida = typeof data === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(data) &&
        !Number.isNaN(dataObj.getTime()) &&
        dataObj.toISOString().slice(0, 10) === data

      if (!dataValida || !['M', 'T', 'N'].includes(periodo) ||
          !Array.isArray(funcoes) || funcoes.length === 0 || funcoes.length > 30) {
        reply.code(400)
        return { success: false, message: 'Data, período ou funções inválidos.' }
      }

      datas.add(data)
      for (const funcCod of funcoes) {
        const codigo = Number(funcCod)
        if (!Number.isSafeInteger(codigo) || codigo < 1) {
          reply.code(400)
          return { success: false, message: 'Código de função inválido.' }
        }
        tarefas.push({ indice: tarefas.length, data, periodo, funcCod: codigo })
      }
    }

    const ordenadas = [...datas].sort()
    const inicio = Date.parse(`${ordenadas[0]}T00:00:00Z`)
    const fim = Date.parse(`${ordenadas[ordenadas.length - 1]}T00:00:00Z`)
    if (datas.size > 30 || (fim - inicio) / 86400000 >= 30 || tarefas.length > 900) {
      reply.code(400)
      return { success: false, message: 'Limite de geração excedido.' }
    }

    // O índice corresponde à posição de cada função na ordem enviada em escalas.
    // Assim, duas funções iguais no mesmo período continuam sendo vagas distintas.
    const fixas = new Map()
    const ocupadosManuais = new Set()
    for (const fixa of atribuicoesFixas) {
      const { indice, userCod, codUserFunc } = fixa || {}
      if (!Number.isSafeInteger(indice) || indice < 0 || indice >= tarefas.length ||
          !Number.isSafeInteger(userCod) || userCod < 1 ||
          !Number.isSafeInteger(codUserFunc) || codUserFunc < 1 ||
          fixas.has(indice) || excluidos.has(userCod)) {
        reply.code(400)
        return { success: false, message: 'Atribuição manual inválida.' }
      }
      const tarefa = tarefas[indice]
      const chave = `${tarefa.data}|${tarefa.periodo}|${userCod}`
      if (ocupadosManuais.has(chave)) {
        reply.code(400)
        return { success: false, message: 'Colaborador repetido no mesmo período.' }
      }
      ocupadosManuais.add(chave)
      fixas.set(indice, { userCod, codUserFunc })
    }

    const cache = new Map()
    const cacheConflitos = new Map()
    const disponibilidade = []
    const resultadoFinal = Array(tarefas.length).fill(null)

    for (const tarefa of tarefas) {
      const chavePeriodo = `${tarefa.data}|${tarefa.periodo}`
      if (!cacheConflitos.has(chavePeriodo)) {
        const query = new URLSearchParams({
          userId, data: tarefa.data, periodo: tarefa.periodo
        })
        const { response, data: resultado } = await consultarRegistrador(
          `/consultarconflitosescala?${query}`
        )
        if (!response.ok || !resultado.success ||
            !Array.isArray(resultado.usuariosOcupados)) {
          reply.code(503)
          return { success: false, message: 'Não foi possível verificar os conflitos das escalas.' }
        }
        cacheConflitos.set(chavePeriodo, new Set(resultado.usuariosOcupados.map(Number)))
      }

      const chaveFuncao = `${tarefa.data}|${tarefa.funcCod}`
      if (!cache.has(chaveFuncao)) {
        const query = new URLSearchParams({
          userId, funcCod: String(tarefa.funcCod), data: tarefa.data
        })
        const { response, data: resultado } = await consultarRegistrador(
          `/consultarusuariosdisponiveis?${query}`
        )
        if (!response.ok || !resultado.success || !Array.isArray(resultado.usuarios)) {
          reply.code(503)
          return { success: false, message: 'Erro ao consultar colaboradores disponíveis.' }
        }
        cache.set(chaveFuncao, resultado.usuarios)
      }

      const usuarios = cache.get(chaveFuncao)
        .filter(u => !excluidos.has(Number(u.user_cod)) &&
          !cacheConflitos.get(chavePeriodo).has(Number(u.user_cod)))
        .map(u => ({
          userCod: Number(u.user_cod),
          nome: u.user_nome,
          codUserFunc: Number(u.cod_user_func)
        }))

      const fixa = fixas.get(tarefa.indice)
      if (fixa) {
        const usuario = usuarios.find(u =>
          u.userCod === fixa.userCod && u.codUserFunc === fixa.codUserFunc)
        if (!usuario) {
          reply.code(409)
          return { success: false, message: `A escolha manual da posição ${tarefa.indice + 1} não está disponível.` }
        }
        resultadoFinal[tarefa.indice] = {
          ...tarefa, userCod: fixa.userCod,
          codUserFunc: fixa.codUserFunc, nome: usuario.nome, origem: 'manual'
        }
      } else {
        disponibilidade.push({
          ...tarefa,
          usuarios: usuarios.filter(u =>
            !ocupadosManuais.has(`${tarefa.data}|${tarefa.periodo}|${u.userCod}`))
        })
      }
    }

    // Quando todas as posições foram preenchidas manualmente, não é necessário chamar o Gemini.
    if (disponibilidade.length > 0) {
            const contents = `Você é responsável por sugerir escalas de trabalho.
Para cada posição escolha somente um colaborador da lista permitida.
Não invente colaboradores. Não use o mesmo colaborador duas vezes na mesma data e período.
Distribua o trabalho de maneira equilibrada.
Quando não houver colaborador disponível, use null em userCod e codUserFunc.
Retorne exatamente uma entrada por posição, mantendo o campo indice de cada posição.
Responda apenas com JSON válido no formato:
{"escalas":[{"indice":0,"userCod":1,"codUserFunc":1}]}
Posições: ${JSON.stringify(disponibilidade)}`

      const response = await fetch(`${API_IA_URL}/gerar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        signal: AbortSignal.timeout(65000)
      })

      const resposta = await response.json()

      if (!response.ok || !resposta.success) {
        reply.code(502)
        return {
          success: false,
          message: resposta.message || 'Falha na comunicação com a ApiIa.'
        }
      }

      let sugestao
      try {
        sugestao = JSON.parse(resposta.text)
      } catch {
        reply.code(502)
        return { success: false, message: 'Resposta inválida do Gemini.' }
      }
      if (!Array.isArray(sugestao?.escalas) ||
          sugestao.escalas.length !== disponibilidade.length) {
        reply.code(502)
        return { success: false, message: 'Quantidade de escalas inválida.' }
      }

      const restantes = new Map(disponibilidade.map(p => [p.indice, p]))
      const utilizados = new Set(ocupadosManuais)
      for (const item of sugestao.escalas) {
        const posicao = restantes.get(item?.indice)
        if (!posicao) {
          reply.code(502)
          return { success: false, message: 'Posição inválida retornada pela IA.' }
        }
        restantes.delete(item.indice)
        const userCod = item.userCod == null ? null : Number(item.userCod)
        const codUserFunc = item.codUserFunc == null ? null : Number(item.codUserFunc)
        const usuario = posicao.usuarios.find(u =>
          u.userCod === userCod && u.codUserFunc === codUserFunc)
        const chave = `${posicao.data}|${posicao.periodo}|${userCod}`
        if ((userCod !== null && !usuario) ||
            (userCod === null && codUserFunc !== null) ||
            (userCod !== null && utilizados.has(chave))) {
          reply.code(502)
          return { success: false, message: 'Atribuição inválida retornada pela IA.' }
        }
        if (userCod !== null) utilizados.add(chave)
        resultadoFinal[posicao.indice] = {
          ...posicao, usuarios: undefined, userCod, codUserFunc,
          nome: usuario?.nome || null, origem: 'ia'
        }
      }
    }

    return {
      success: true,
      message: 'Sugestão gerada. Revise antes de salvar.',
      escalas: resultadoFinal
    }
  } catch (error) {
    console.error('ERRO GERAESCALAIA:', error)
    await log('error', 'geraescalaia_failed', { message: error.message })
    reply.code(503)
    return { success: false, message: 'Não foi possível gerar a escala com o Gemini.' }
  }
})

app.get('/consultaescalas', async (request, reply) => {
  try {
    const userId = await obterUidAutenticado(request, reply)
    if (!userId) return { success: false, message: 'Sessão do usuário expirada' }

    const query = new URLSearchParams({
      userId,
      q: String(request.query.q || '').trim()
    })
    const { response, data } = await consultarRegistrador(
      `/consultaescalas?${query}`
    )

    reply.code(response.status)
    return data
  } catch (error) {
    await log('error', 'consultaescalas_failed', { message: error.message })
    reply.code(503)
    return { success: false, message: 'Não foi possível consultar as escalas' }
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