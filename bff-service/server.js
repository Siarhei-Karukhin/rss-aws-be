import Fastify from 'fastify';
import axios from 'axios';
import 'dotenv/config';

const fastify = Fastify({ logger: true });

fastify.route({
  method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
  url: '/*',
  handler: (request, reply) => {
    const { originalUrl, method, body } = request;

    console.log('originalUrl: ', originalUrl);
    console.log('method: ', method);
    console.log('body: ', body ?? null);
    console.log('process.env.zxc', process.env.zxc);

    axios({
      url: 'https://api.example.com/123',
      method: 'get',
      params: {
        userId: 123
      },
      headers: {
        'Authorization': 'Bearer 123'
      },
      timeout: 5000,
      responseType: 'json'
    }).then(response => {
      console.log(response.data);
    }).catch(error => {
      console.error('Error during API request', error);
    });
    
    reply.send({ originalUrl, method, body: body ?? null });
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
start();
