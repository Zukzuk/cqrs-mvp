FROM cqrs-mvp/base:latest

WORKDIR /usr/src/app/order-service
COPY order-service/package*.json ./
RUN npm install
COPY order-service .
RUN npm run build

ENTRYPOINT ["sh","-c","\
    /usr/local/bin/wait-for-it broker-service:5672 --timeout=30 --strict --quiet && \
    exec node dist/index.js\
    "]
CMD []