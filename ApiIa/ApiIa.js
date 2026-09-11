import fastify from 'fastify'
import { ADDRESS_API, PORT_API } from './config-apiia.js'

const app = fastify({ logger: false });


app.get('/', async () => ({

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