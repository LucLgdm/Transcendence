FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Installation de TypeScript
RUN npm install -g typescript serve
RUN npm install three @types/three

COPY . .

# On monte le code au runtime, pas besoin de COPY
CMD ["sh"]
