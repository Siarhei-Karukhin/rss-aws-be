import Fastify from 'fastify';
import axios from 'axios';
import 'dotenv/config';

const fastify = Fastify({ logger: true });

fastify.route({
  method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
  url: '/*',
  handler: (request, reply) => {
    const { originalUrl, method, body: data, headers } = request;
    console.log('#originalUrl: ', originalUrl);
    console.log('#method: ', method);
    console.log('#data: ', data);
    console.log('#headers: ', headers);

    if (originalUrl === '/favicon.ico') {
      return reply.status(204).send();
    }

    const [path] = originalUrl.split('?');
    const serviceKey = path.split('/')[1];
    console.log('#path: ', path);
    console.log('#serviceKey: ', serviceKey);

    if (serviceKey !== 'cart-api' && serviceKey !== 'product-api') {
      return reply.status(502).send({ error: 'Cannot process request' });
    }

    const apiHost = process.env[serviceKey.replace('-', '')];
    const apiPath = originalUrl.replace(`/${serviceKey}`, '');
    const url = `${apiHost}${apiPath}`;
    console.log('#url: ', url);

    axios({
      url,
      data,
      method,
      headers: { 'Authorization': headers.authorization },
      timeout: 5000,
      responseType: 'json'
    }).then((response) => {
      const { status, data } = response;
      reply.send({ status, data });
    }).catch((error) => {
      reply.send({ error });
    });

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
