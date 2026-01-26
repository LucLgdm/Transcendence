FROM node:20-alpine

WORKDIR /app

# Installation de TypeScript
RUN npm install -g typescript serve

# On monte le code au runtime, pas besoin de COPY
CMD ["sh"]
