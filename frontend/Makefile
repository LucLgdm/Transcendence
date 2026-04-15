# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: lde-merc <lde-merc@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/01/05 17:37:46 by lde-merc          #+#    #+#              #
#    Updated: 2026/03/03 15:52:25 by lde-merc         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

all:
	@echo "Building Docker image..."
	docker build -t ts-dev .

	@echo "Starting container..."
	-docker rm -f ts-dev-front 2>/dev/null || true
	docker run -d --rm\
		--name ts-dev-front \
		-p 8080:3000 \
		-v $(CURDIR):/app \
		ts-dev sh -c "\
			tsc && \
			serve -l tcp://0.0.0.0:3000 . \
		"

clean:
	@echo "Cleaning compiled files..."
	-docker stop ts-dev-front 2>/dev/null || true
	@rm -f *.js

re: clean all

.PHONY: all clean re
