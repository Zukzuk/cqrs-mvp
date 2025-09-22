# --- build stage ---
FROM node:22-alpine AS build
WORKDIR /app
COPY shop-webserver/package*.json ./ 
RUN npm i
COPY shop-webserver .
RUN npm run build

# --- runtime stage ---
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY shop-webserver/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 3001
CMD ["nginx", "-g", "daemon off;"]
