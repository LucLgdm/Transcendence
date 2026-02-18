# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: ade-rese <ade-rese@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/01/28 10:57:36 by lde-merc          #+#    #+#              #
#    Updated: 2026/02/18 15:06:13 by ade-rese         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

all:
	@echo "Building Docker image..."
	./script/generate_cert.sh
	docker compose build

	@echo "Starting services..."
	docker compose up

stop:
	@echo "Stopping services..."
	docker compose down

clean:
	@echo "Cleaning up Docker images and containers..."
	@rm src/*/*.js || true
	docker compose down --rmi all
	
	@echo "Cleanup complete."

data:
	@echo "Accessing the database..."
	docker exec -it backend-db-1 psql -U user -d mydatabase

re: clean all

.PHONY: all stop clean re

# curl -X POST http://localhost:3000/users \
#  -H "Content-Type: application/json" \
#  -d '{"username":"testuser","email":"test@test.com","password":"secret"}'
#
# curl http://localhost:3000/users