# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: lde-merc <lde-merc@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/01/28 10:57:36 by lde-merc          #+#    #+#              #
#    Updated: 2026/01/28 11:04:39 by lde-merc         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

all:
	@echo "Building Docker image..."
	docker compose build

	@echo "Starting services..."
	docker compose up

stop:
	@echo "Stopping services..."
	docker compose down

clean:
	@echo "Cleaning up Docker images and containers..."
	docker compose down --rmi all

re: clean all

.PHONY: all stop clean re