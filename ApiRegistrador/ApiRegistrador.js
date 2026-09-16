import fastify from 'fastify'
import cors from '@fastify/cors'
import { ADDRESS_WEB, ADDRESS_API, PORT_API, PASSWORD_DB, USER_DB } from './config-apiregistrador.js'

const app = fastify({ logger: false });

await app.register(cors, {
  origin: ADDRESS_WEB
})


app.post('/login', async (request) => {
  console.log('Login recebido para:', request.body?.email)

  return {
    message: 'Login OK'
  }
});

app.post('/registrar', async () => ({

}));



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