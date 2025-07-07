FROM node:22-alpine

# Install bash and curl
RUN apk add --no-cache bash curl

# Fetch wait-for-it script at build time and make executable
RUN curl -fsSL \
    https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh \
    -o /usr/local/bin/wait-for-it \
    && chmod +x /usr/local/bin/wait-for-it

# Set working directory and install shared eventbus
WORKDIR /usr/src/app
COPY shared/eventbus ./shared/eventbus
RUN cd shared/eventbus \
    && npm install \
    && npm run build

# Switch to the service dir
WORKDIR /usr/src/app/shop-bff-service
COPY shop-bff-service/package*.json ./
RUN npm install
COPY shop-bff-service .
RUN npm run build

ENTRYPOINT ["sh", "-c", \
    "/usr/local/bin/wait-for-it rabbitmq:5672 --timeout=30 --strict && \
    exec node dist/index.js"]
CMD []
