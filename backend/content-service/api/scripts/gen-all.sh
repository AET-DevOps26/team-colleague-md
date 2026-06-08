#!/bin/bash
# /api/scripts/gen-all.sh

set -e  # stop on first error

# Resolve absolute paths based on script location
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
API_DIR=$(dirname "$SCRIPT_DIR")

OPENAPI_FILE="/spec/openapi.yaml"
OUTPUT_FILE="/spec/docs.html"

echo "====================================================="
echo " OpenAPI Documentation (Docker Redocly)"
echo "====================================================="

echo "[1/2] Validating openapi.yaml..."

MSYS_NO_PATHCONV=1 docker run --rm \
  -v "${API_DIR}:/spec" \
  redocly/cli \
  lint /spec/openapi.yaml

echo "Validation passed!"

echo "[2/2] Generating HTML documentation..."

MSYS_NO_PATHCONV=1 docker run --rm \
  -v "${API_DIR}:/spec" \
  redocly/cli \
  build-docs /spec/openapi.yaml -o /spec/docs.html

echo "Documentation generated successfully!"
echo "Output: ${API_DIR}/docs.html"

echo "====================================================="
