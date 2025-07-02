# order-service/Dockerfile
FROM node:18-alpine

# 1) Put us at /usr/src/app
WORKDIR /usr/src/app

# 2) Copy in the shared-eventbus folder (with its package.json & dist/)
COPY shared/eventbus ./shared/eventbus

# 3) Install EventBus dependencies & compile it
RUN cd shared/eventbus \
    && npm install \
    && npm run build
    
# 3) Switch to the service dir
WORKDIR /usr/src/app/order-service

# 4) Copy only this service's package files
COPY order-service/package*.json ./

# 5) Install, letting npm pick up file:../shared/eventbus
RUN npm install

# 6) Copy service sources & build
COPY order-service .
RUN npm run build

# 7) Start
CMD ["node", "dist/index.js"]
