import fastify from 'fastify'
import { GoogleGenAI } from '@google/genai'
import { loadEnvFile } from 'node:process'
import { ADDRESS_API, PORT_API, SAVE_LOG, TIMEOUT_IA } from './config-apiia.js'
import { createApiLogger } from '../apiLogger.js'

loadEnvFile()

const app = fastify({ logger: false });
const log = createApiLogger(import.meta.url, 'ApiIa', SAVE_LOG)

app.addHook('onResponse', async (request, reply) => {
  await log('info', 'http_response', {
    method: request.method,
    route: request.routeOptions?.url || request.url.split('?')[0],
    statusCode: reply.statusCode,
    responseTimeMs: Math.round(request.elapsedTime * 100) / 100
  })
})

app.get('/', async () => ({

}));

app.post('/gerar', async (request, reply) => {
  const { contents } = request.body ?? {}

  if (typeof contents !== 'string' || !contents.trim()) {
    return reply.code(400).send({
      success: false,
      message: 'Conteúdo para a IA não informado.'
    })
  }

  if (!process.env.GEMINI_API_KEY) {
    return reply.code(503).send({
      success: false,
      message: 'Chave do Gemini não configurada.'
    })
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { timeout: TIMEOUT_IA }
    })

    const resposta = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
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