ARG SERVICE_PATH=shop/shop-bff-service

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
FROM node:22-alpine
ARG SERVICE_PATH
ENV SERVICE_PATH=${SERVICE_PATH}

WORKDIR /usr/src/${SERVICE_PATH}
COPY --from=build /usr/local/bin/wait-for-it /usr/local/bin/wait-for-it
COPY --from=build /usr/src/shared /usr/src/shared
COPY --from=build /usr/src/observability /usr/src/observability
COPY --from=build /usr/src/node_modules /usr/src/node_modules
COPY --from=build /usr/src/${SERVICE_PATH}/dist ./dist
COPY --from=build /usr/src/${SERVICE_PATH}/package*.json ./

RUN apk add --no-cache bash
ENTRYPOINT ["sh","-c","\
    /usr/local/bin/wait-for-it broker-service:5672 --timeout=30 --strict --quiet && \
    exec node dist/index.js\
    "]
CMD []