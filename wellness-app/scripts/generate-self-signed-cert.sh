#!/usr/bin/env bash
# Generates a self-signed TLS certificate for LAN-only HTTPS access
# (e.g. https://192.168.1.50 or https://wellness.home). For a certificate
# trusted by browsers without a warning, use a real domain with
# Let's Encrypt/certbot instead and point SSL_CERT_PATH/SSL_KEY_PATH at it.
set -euo pipefail
cd "$(dirname "$0")/.."

CERT_DIR="./nginx/certs"
DAYS="${1:-825}"
CN="${2:-wellness.local}"

mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -newkey rsa:2048 \
  -days "$DAYS" \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -subj "/CN=$CN" \
  -addext "subjectAltName=DNS:$CN,DNS:localhost,IP:127.0.0.1"

chmod 600 "$CERT_DIR/privkey.pem"
echo "Self-signed certificate written to $CERT_DIR (CN=$CN, valid $DAYS days)."
echo "Browsers will show a trust warning the first time — that's expected for a self-signed cert."
