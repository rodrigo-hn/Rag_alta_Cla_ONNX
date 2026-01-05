# Frontend Dockerfile - Build stage
FROM node:20-slim AS build

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar codigo fuente
COPY . .

# Build de produccion
RUN npm run build

# Production stage con nginx
FROM nginx:alpine

# Copiar configuracion nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar archivos de build
COPY --from=build /app/dist/epicrisis-frontend/browser /usr/share/nginx/html

# Exponer puerto
EXPOSE 80

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]
