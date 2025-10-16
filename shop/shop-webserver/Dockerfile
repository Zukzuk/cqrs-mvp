ARG SERVICE_PATH=shop/shop-webserver

# --- build stage ---
FROM cqrs-mvp/base:latest AS build
ARG SERVICE_PATH
ENV SERVICE_PATH=${SERVICE_PATH}

WORKDIR /usr/src
COPY . ./${SERVICE_PATH}
RUN npm ci \
  --workspace ${SERVICE_PATH} \
  --include-workspace-root=false
RUN npm run build --workspace ${SERVICE_PATH}
RUN npm prune --omit=dev --workspaces

# --- runtime stage ---
FROM nginx:1.27-alpine
ARG SERVICE_PATH
ENV SERVICE_PATH=${SERVICE_PATH}

WORKDIR /usr/share/nginx
COPY --from=build /usr/local/bin/wait-for-it /usr/local/bin/wait-for-it
COPY --from=build /usr/src/node_modules /usr/src/node_modules
COPY --from=build /usr/src/${SERVICE_PATH}/dist ./html
COPY --from=build /usr/src/${SERVICE_PATH}/default.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
