FROM nginx:stable-alpine

COPY shop-webserver/nginx.conf /etc/nginx/nginx.conf
COPY shop-webserver/default.conf /etc/nginx/conf.d/default.conf
COPY shop-webserver/src/index.html /usr/share/nginx/html/index.html