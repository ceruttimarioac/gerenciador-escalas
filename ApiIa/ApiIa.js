import fastify from 'fastify'
import { ADDRESS_API, PORT_API, SAVE_LOG } from './config-apiia.js'
import { createApiLogger } from '../apiLogger.js'

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