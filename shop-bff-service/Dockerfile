FROM cqrs-mvp/base:latest

WORKDIR /usr/src/app/shop-bff-service
COPY shop-bff-service/package*.json ./
RUN npm install
COPY shop-bff-service .
RUN npm run build

ENTRYPOINT ["sh", "-c", \
    "/usr/local/bin/wait-for-it rabbitmq:5672 --timeout=30 --strict --quiet && \
    exec node dist/index.js"]
CMD []
