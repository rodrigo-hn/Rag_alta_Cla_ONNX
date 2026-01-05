# Backend Dockerfile
FROM node:20-slim

# Instalar Oracle Instant Client
RUN apt-get update && apt-get install -y \
    libaio1 \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Directorio de trabajo
WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar codigo fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Crear directorio de logs
RUN mkdir -p /app/logs

# Exponer puerto
EXPOSE 3000

# Usuario no root
RUN useradd -r -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

# Comando de inicio
CMD ["node", "dist/index.js"]
