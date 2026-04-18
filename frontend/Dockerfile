FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install -g typescript serve && npm ci

COPY . .
CMD ["sh"]
