FROM node:22-alpine

# Put us at /usr/src/app and install shared
WORKDIR /usr/src/app
COPY shared/eventbus ./shared/eventbus
RUN cd shared/eventbus \
    && npm install \
    && npm run build
    
# Switch to the service dir
WORKDIR /usr/src/app/order-service
COPY order-service/package*.json ./
RUN npm install
COPY order-service .
RUN npm run build
CMD ["node", "dist/index.js"]
