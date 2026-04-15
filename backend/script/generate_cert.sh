#!/bin/sh

CERT_DIR=nginx/certs

if [ ! -f "$CERT_DIR/server.crt" ]; then
	mkdir -p $CERT_DIR
	openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout $CERT_DIR/server.key \
	-out $CERT_DIR/server.crt -subj "/C=FR/ST=IDF/L=Paris/O=42/OU=Transcendence/CN=localhost"
fi