ARG SERVICE_PATH=shop/shop-projection-db

# --- build stage ---
FROM cqrs-mvp/base:latest AS build
ARG SERVICE_PATH
ENV SERVICE_PATH=${SERVICE_PATH}

WORKDIR /usr/src
COPY . ./${SERVICE_PATH}
RUN npm ci \
  --workspace ${SERVICE_PATH} \
  --workspace observability/opentelemetry \
  --workspace shared \
  --include-workspace-root=false
RUN npm run build --workspace ${SERVICE_PATH}
RUN npm prune --omit=dev --workspaces

# --- runtime stage ---
FROM mongo:7
ARG SERVICE_PATH
ENV SERVICE_PATH=${SERVICE_PATH}

WORKDIR /opt/seeder
COPY --from=build /usr/local/bin/wait-for-it /usr/local/bin/wait-for-it
COPY --from=build /usr/src/shared /usr/src/shared
COPY --from=build /usr/src/observability /usr/src/observability
COPY --from=build /usr/src/node_modules /usr/src/node_modules
COPY --from=build /usr/src/${SERVICE_PATH}/dist ./dist
COPY --from=build /usr/src/${SERVICE_PATH}/package*.json ./
COPY --from=build /usr/src/${SERVICE_PATH}/scripts/run-seed.sh /docker-entrypoint-initdb.d/01-run-seed.sh

# install nodejs (needed for the seeding script)
RUN apt-get update \
  && apt-get install -y curl gnupg ca-certificates \
  && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*

# give execution rights on the seeding script
RUN chmod +x /docker-entrypoint-initdb.d/01-run-seed.sh
ENTRYPOINT ["sh","-c","\
  /usr/local/bin/wait-for-it order-eventstore-service:4001 --timeout=30 --strict --quiet && \
  exec docker-entrypoint.sh mongod --config /etc/mongo/mongo.conf\
  "]
CMD []