# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: lde-merc <lde-merc@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/01/05 17:37:46 by lde-merc          #+#    #+#              #
#    Updated: 2026/02/19 09:11:22 by lde-merc         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

all:
	@echo "Building Docker image..."
	docker build -t ts-dev .

	@echo "Starting container..."
	docker run -it --rm \
		-p 3000:3000 \
		-v $(PWD):/app \
		ts-dev sh -c "\
			tsc && \
			serve . \
		"

clean:
	@echo "Cleaning compiled files..."
	@rm -f *.js
	@make clean -C backend
	@make clean -C frontend

re: clean all

.PHONY: all clean re
