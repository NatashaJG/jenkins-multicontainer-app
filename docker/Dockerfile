# ==========================
# Imagen base
# ==========================
FROM node:24-alpine

# ==========================
# Directorio de trabajo
# ==========================
WORKDIR /app

# ==========================
# Copiar archivos de dependencias
# ==========================
COPY package*.json ./

# ==========================
# Instalar TODAS las dependencias
# ==========================
RUN npm install

# ==========================
# Copiar el proyecto completo
# ==========================
COPY . .

# ==========================
# Puerto de la aplicación
# ==========================
EXPOSE 3000

# ==========================
# Variables de entorno
# ==========================
ENV NODE_ENV=production

# ==========================
# Comando de inicio
# ==========================
CMD ["npm", "start"]