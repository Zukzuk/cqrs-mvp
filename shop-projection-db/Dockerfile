FROM node:22-alpine AS builder
WORKDIR /opt/seeder

COPY package*.json ./
RUN npm i
COPY . .  

FROM mongo:7

# install Node.js / ts-node runtime
RUN apt-get update \
 && apt-get install -y curl gnupg ca-certificates \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y nodejs \
 && npm install -g ts-node \
 && rm -rf /var/lib/apt/lists/*

# bring across all built files & node_modules
COPY --from=builder /opt/seeder /opt/seeder

# hook into mongo’s init.d
COPY scripts/run-seed.sh /docker-entrypoint-initdb.d/01-run-seed.sh
RUN chmod +x /docker-entrypoint-initdb.d/01-run-seed.sh

CMD ["--config", "/etc/mongo/mongo.conf"]