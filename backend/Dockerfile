# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Dockerfile                                         :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: lde-merc <lde-merc@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/01/28 10:57:48 by lde-merc          #+#    #+#              #
#    Updated: 2026/01/28 12:12:40 by lde-merc         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

FROM node:20-alpine

WORKDIR /app

RUN npm install -g typescript ts-node

COPY package*.json ./

RUN npm ci

COPY src ./src
COPY tsconfig.json ./

# Temporairement désactivé pour déboguer
# RUN npm run build

EXPOSE 3000

CMD ["ts-node", "src/server.ts"]