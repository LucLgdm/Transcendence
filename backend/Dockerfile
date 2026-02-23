# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Dockerfile                                         :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: lde-merc <lde-merc@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/01/28 10:57:48 by lde-merc          #+#    #+#              #
#    Updated: 2026/02/23 14:17:55 by lde-merc         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

FROM node:20-alpine

WORKDIR /app

RUN npm install -g typescript ts-node

COPY package*.json ./

RUN npm ci
# Hasher les mots de passe avec bcrypt, et gérer les tokens d'authentification avec jsonwebtoken
RUN npm install jsonwebtoken bcrypt && npm install -D @types/jsonwebtoken @types/bcrypt
# Gérer les requêtes cross-origin avec CORS
RUN npm install cors && npm install -D @types/cors

COPY src ./src
COPY tsconfig.json ./

# Temporairement désactivé pour déboguer
# RUN npm run build

EXPOSE 3000

CMD ["ts-node", "src/server.ts"]