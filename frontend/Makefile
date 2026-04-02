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
	docker run -d --rm\
		--name ts-dev-front \
		-p 8080:3000 \
		-v $(PWD)/frontend:/app \
		ts-dev sh -c "\
			tsc && \
			serve . \
		"

clean:
	@echo "Cleaning compiled files..."
	-docker stop ts-dev-front 2>/dev/null || true
	@rm -f *.js

re: clean all

.PHONY: all clean re
