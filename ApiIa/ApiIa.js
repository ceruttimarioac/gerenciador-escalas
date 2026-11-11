import fastify from 'fastify'
import { GoogleGenAI } from '@google/genai'
import { ADDRESS_API, PORT_API, TIMEOUT_IA, GEMINI_API_KEY } from './config-apiia.js'

const app = fastify({ logger: false });

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

  if (!GEMINI_API_KEY) {
    return reply.code(503).send({
      success: false,
      message: 'Chave do Gemini não configurada.'
    })
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
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
  } catch {

    return reply.code(502).send({
      success: false,
      message: 'Falha na comunicação com o Gemini.'
    })
  }
})

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