import fastify from 'fastify'
import { ADDRESS_API, PORT_API, PASSWORD_DB, USER_DB } from './config-apiregistrador.js'

const app = fastify({ logger: false });


app.get('/consultausuario', async (request) => ({
  success: true,
  usuarios: [],
  filtro: request.query.textopesquisado || ''
}));






const start = async () => {
  try {
    await app.listen({
      port: PORT_API || 3334,
      host: ADDRESS_API || '127.0.0.1'
    });
    console.log(`Server is running on port ${PORT_API}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();