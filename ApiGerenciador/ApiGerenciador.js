import fastify from 'fastify'
import cors from '@fastify/cors'
import { ADDRESS_WEB, ADDRESS_API, PORT_API, KEY_FIREBASE_API } from './config-apigerenciador.js'

const app = fastify({ logger: false });

await app.register(cors, {
  origin: ADDRESS_WEB
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
    return {
      success: false,
      message: error.message
    };
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