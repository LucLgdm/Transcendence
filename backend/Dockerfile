# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Dockerfile                                         :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: lde-merc <lde-merc@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/01/28 10:57:48 by lde-merc          #+#    #+#              #
#    Updated: 2026/02/23 11:29:52 by lde-merc         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

FROM node:20-alpine

WORKDIR /app

RUN npm install -g typescript ts-node

COPY package*.json ./

RUN npm ci
# Hasher les mots de passe avec bcrypt
RUN npm install bcrypt && npm install -D @types/bcrypt
# Gérer les requêtes cross-origin avec CORS
RUN npm install cors && npm install -D @types/cors

COPY src ./src
COPY tsconfig.json ./

# Temporairement désactivé pour déboguer
# RUN npm run build

EXPOSE 3000

CMD ["ts-node", "src/server.ts"]