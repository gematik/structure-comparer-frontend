FROM node:22-alpine AS builder

WORKDIR /build

COPY ./public ./public
COPY ./src ./src
COPY ./*.json .

RUN npm install
RUN npm run build
