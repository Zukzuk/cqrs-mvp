FROM cqrs-mvp/base:latest

WORKDIR /usr/src/app/event-store
COPY event-store/package*.json ./
RUN npm install
COPY event-store .
RUN npm run build

ENTRYPOINT ["sh", "-c", \
    "/usr/local/bin/wait-for-it rabbitmq:5672 --timeout=30 --strict --quiet && \
    exec node dist/index.js"]
CMD []