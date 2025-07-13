FROM cqrs-mvp/base:latest

WORKDIR /usr/src/app/order-eventstore-service
COPY order-eventstore-service/package*.json ./
RUN npm install
COPY order-eventstore-service .
RUN npm run build

ENTRYPOINT ["sh","-c","\
     /usr/local/bin/wait-for-it order-eventstore-db:27017 --timeout=30 --strict --quiet && \
     exec node dist/index.js\
     "]
CMD []