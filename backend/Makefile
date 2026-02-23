# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: lde-merc <lde-merc@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/01/28 10:57:36 by lde-merc          #+#    #+#              #
#    Updated: 2026/02/23 10:50:35 by lde-merc         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

all:
	@echo "Building Docker image..."
	docker compose build

	@echo "Starting services..."
	docker compose up

stop:
	@echo "Stopping services..."
	docker compose stop

clean:
	@echo "Cleaning compiled files..."
	@rm -f src/*.js src/*/*.js
	docker compose down -v
	
	@echo "Cleanup complete."

data:
	@echo "Accessing the database..."
	docker exec -it backend-db-1 psql -U user -d mydatabase

re: clean all

.PHONY: all stop clean re

# curl -X POST http://localhost:3000/users 
#  -H "Content-Type: application/json" 
#  -d '{"username":"testuser","email":"test@test.com","password":"secret"}'
#
# curl http://localhost:3000/users