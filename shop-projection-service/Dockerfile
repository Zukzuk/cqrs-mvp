FROM cqrs-mvp/base:latest

WORKDIR /usr/src/app/shop-projection-service
COPY shop-projection-service/package*.json ./
RUN npm install
COPY shop-projection-service .
RUN npm run build

ENTRYPOINT ["sh","-c","\
    /usr/local/bin/wait-for-it broker-service:5672 --timeout=30 --strict --quiet && \
    /usr/local/bin/wait-for-it shop-bff-service:3000 --timeout=30 --strict --quiet && \
    /usr/local/bin/wait-for-it shop-projection-db:27017 --timeout=30 --strict --quiet && \
    exec node dist/index.js\
    "]
CMD []