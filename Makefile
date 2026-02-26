# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: lde-merc <lde-merc@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/01/05 17:37:46 by lde-merc          #+#    #+#              #
#    Updated: 2026/02/20 12:04:10 by lde-merc         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

all:
	@make -C backend
	@make -C frontend

clean:
	@echo "Cleaning compiled files..."
	@rm -f *.js
	@make clean -C backend
	@make clean -C frontend

re: clean all

.PHONY: all clean re
