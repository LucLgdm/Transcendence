# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: lde-merc <lde-merc@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/01/05 17:37:46 by lde-merc          #+#    #+#              #
#    Updated: 2026/02/23 16:43:51 by lde-merc         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

all:
	@echo "Building Docker image..."
	docker build -t ts-dev .

	@echo "Starting container..."
	docker run -it --rm\
		-p 8080:3000 \
		-v $(PWD)/frontend:/app \
		ts-dev sh -c "\
			tsc && \
			serve . \
		"

clean:
	@echo "Cleaning compiled files..."
	@rm -f *.js
	@echo "Cleaning up Docker images and containers..."
	docker compose down --volumes --rmi all


re: clean all

.PHONY: all clean re
