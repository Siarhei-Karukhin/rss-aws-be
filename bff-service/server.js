import Fastify from 'fastify';
import cors from '@fastify/cors';
import axios from 'axios';
import NodeCache from 'node-cache';
import 'dotenv/config';

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: '*' });

fastify.decorate('cache', new NodeCache({ stdTTL: 60 * 2, checkperiod: 60 * 2 }));

fastify.route({
  method: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH'],
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

    const isGetProductsListRoute = originalUrl === '/product-api/products';
    const productsListCacheKey = 'productsList';
    const cachedProductsList = fastify.cache.get(productsListCacheKey);
    console.log('#isGetProductsListRoute: ', isGetProductsListRoute);
    console.log('#cachedProductsList: ', cachedProductsList);

    if (isGetProductsListRoute && cachedProductsList) {
      const { status, data } = cachedProductsList;

      return reply.status(status).send(data);
    }

    const cacheProductsList = (status, data) => {
      if (isGetProductsListRoute && !cachedProductsList) {
        fastify.cache.set(productsListCacheKey, { status, data });
      }
    };

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
    })
    .then((response) => {
      const { status, data } = response;
      cacheProductsList(status, data);
      reply.status(status).send(data);
    })
    .catch((error) => {
      if (error?.response) {
        const { status, data } = error.response;
        cacheProductsList(status, data);
        reply.status(status).send(data);
      } else {
        reply.status(500).send('Something went wrong :{ ');
      }
    });

  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 3125, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
start();
