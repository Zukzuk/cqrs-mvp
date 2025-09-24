FROM cqrs-mvp/base:latest

WORKDIR /usr/src/app/calendar-eventstore-service
COPY calendar-eventstore-service/package*.json ./
RUN npm install
COPY calendar-eventstore-service .
RUN npm run build

ENTRYPOINT ["sh","-c","\
     /usr/local/bin/wait-for-it calendar-eventstore-db:27017 --timeout=30 --strict --quiet && \
     exec node dist/index.js\
     "]
CMD []