FROM node:22-alpine
WORKDIR /usr/src/app
COPY --chown=node:node package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --chown=node:node . .
USER node
EXPOSE 3000
ENV PORT=3000
CMD [ "node", "server.js" ]
