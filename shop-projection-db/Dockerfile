# ─── BUILD STAGE: use your monorepo base ────────────────────────────────
FROM cqrs-mvp/base:latest AS builder

WORKDIR /usr/src/app/shop-projection-db

# copy only this service’s package.json + lock + tsconfig
COPY shop-projection-db/package*.json shop-projection-db/tsconfig.json ./

# vendor in your shared interfaces for the local file:../shared/interfaces
COPY shared/interfaces ../shared/interfaces

# install *just* this service’s deps (will use root-workspace node_modules)
RUN npm i

# copy & build the TS into ./dist
COPY shop-projection-db/src src
RUN npm run build


# ─── RUNTIME STAGE: lean Mongo + wait-for-it from base ────────────────
FROM mongo:7

# install Node so we can run the seeder
RUN apt-get update \
 && apt-get install -y curl gnupg ca-certificates \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y nodejs \
 && rm -rf /var/lib/apt/lists/*

# bring over wait-for-it (already in base)
COPY --from=builder /usr/local/bin/wait-for-it /usr/local/bin/wait-for-it

# copy the compiled JS
COPY --from=builder /usr/src/app/shop-projection-db/dist    /opt/seeder/dist

# copy the *root* node_modules (contains your service’s deps)
COPY --from=builder /usr/src/app/node_modules               /opt/seeder/node_modules

# hook in your init‐seed script
COPY shop-projection-db/scripts/run-seed.sh /docker-entrypoint-initdb.d/01-run-seed.sh
RUN chmod +x /docker-entrypoint-initdb.d/01-run-seed.sh

# wait for EventStore, then exec Mongo’s own entrypoint (which runs your seed)
ENTRYPOINT ["sh","-c","\
    /usr/local/bin/wait-for-it order-eventstore-service:4001 --timeout=30 --strict --quiet && \
    exec docker-entrypoint.sh mongod --config /etc/mongo/mongo.conf\
"]
CMD []
