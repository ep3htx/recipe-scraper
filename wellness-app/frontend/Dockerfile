# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# ---- serve the static build ----
# A plain static file server is enough here — Nginx in front already
# handles TLS, compression, caching headers, and routing.
FROM node:20-alpine AS production
WORKDIR /app
RUN npm install -g serve@14 && \
    addgroup -S wellness && adduser -S wellness -G wellness
COPY --from=build /app/dist ./dist
USER wellness
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
