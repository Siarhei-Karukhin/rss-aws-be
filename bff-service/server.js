import Fastify from 'fastify';

const fastify = Fastify({ logger: true });

fastify.route({
  method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
  url: '/*',
  handler: (request, reply) => {
    const { originalUrl, method, body } = request;

    console.log('originalUrl: ', originalUrl);
    console.log('method: ', method);
    console.log('body: ', body ?? null);
    
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
