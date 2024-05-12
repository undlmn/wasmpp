FROM node:18-alpine
RUN apk add wabt --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/edge/testing
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm i
