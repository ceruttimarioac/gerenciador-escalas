import fastify from 'fastify'
import { GoogleGenAI } from '@google/genai'
import { ADDRESS_API, PORT_API, SAVE_LOG, TIMEOUT_IA, GEMINI_API_KEY } from './config-apiia.js'
import { createApiLogger } from '../apiLogger.js'

const app = fastify({ logger: false })
const log = createApiLogger(import.meta.url, 'ApiIa', SAVE_LOG)
// Reutiliza o cliente nas requisições e permite informar claramente quando falta a chave.
const ai = GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
      httpOptions: { timeout: TIMEOUT_IA }
    })
  : null

app.addHook('onResponse', async (request, reply) => {
  await log('info', 'http_response', {
    method: request.method,
    route: request.routeOptions?.url || request.url.split('?')[0],
    statusCode: reply.statusCode,
    responseTimeMs: Math.round(request.elapsedTime * 100) / 100
  })
})

app.post('/gerar', async (request, reply) => {
  const { contents } = request.body ?? {}

  if (typeof contents !== 'string' || !contents.trim()) {
    return reply.code(400).send({
      success: false,
      message: 'Conteúdo para a IA não informado.'
    })
  }

  if (!ai) {
    return reply.code(503).send({
      success: false,
      message: 'Chave do Gemini não configurada.'
    })
  }

  try {
    const resposta = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        // O frontend espera que o conteúdo gerado esteja em JSON.
        responseMimeType: 'application/json'
      }
    })

    if (!resposta.text) {
      return reply.code(502).send({
        success: false,
        message: 'O Gemini retornou uma resposta vazia.'
      })
    }

    return {
      success: true,
      text: resposta.text
    }
  } catch (erro) {
    await log('error', 'gemini_request_failed', {
      message: erro.message
    })

    return reply.code(502).send({
      success: false,
      message: 'Falha na comunicação com o Gemini.'
    })
  }
})

const start = async () => {
  try {
    await app.listen({ port: PORT_API, host: ADDRESS_API })
    await log('info', 'api_started', { host: ADDRESS_API, port: PORT_API })
    console.log(`Server is running on port ${PORT_API}`)
  } catch (err) {
    await log('error', 'api_start_failed', { message: err.message })
    app.log.error(err)
    process.exit(1)
  }
}

start()