FROM golang:1.22-alpine AS backend-builder
RUN apk add --no-cache gcc musl-dev
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=1 GOOS=linux go build -o server ./cmd/server/

FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM caddy:2-alpine
RUN apk add --no-cache ca-certificates
COPY --from=backend-builder /app/server /app/server
COPY --from=frontend-builder /app/dist /app/frontend/dist
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 8000

CMD /app/server & sleep 1 && caddy run --config /etc/caddy/Caddyfile
