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
	docker run -it --rm\
		-p 8080:3000 \
		-v $(PWD):/app \
		ts-dev sh -c "\
			tsc && \
			serve . \
		"

clean:
	@echo "Cleaning compiled files..."
	@rm -f *.js
	@rm -f pong/*.js
	@echo "Cleaning up Frontend image"
	-docker stop ts-dev 2>/dev/null || true
	-docker rm ts-dev 2>/dev/null || true
	-docker rmi ts-dev 2>/dev/null || true


re: clean all

.PHONY: all clean re
