FROM node:22-alpine
WORKDIR /usr/src/app
COPY --chown=node:node package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --chown=node:node . .
USER node
EXPOSE 3125
ENV PORT=3125
CMD [ "node", "server.js" ]
