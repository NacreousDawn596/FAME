# Frontend image: compiled at build time, served statically by Nginx.
FROM node:22-alpine AS builder

WORKDIR /app

COPY fame-react/package.json fame-react/package-lock.json ./
RUN npm ci

COPY fame-react/ ./
RUN npm run build

FROM nginx:1.27-alpine

COPY infra/nginx/frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
