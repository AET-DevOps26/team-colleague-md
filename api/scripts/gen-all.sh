#!/bin/bash
# /api/scripts/gen-all.sh

# Resolve absolute paths based on the script's location
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
API_DIR=$(dirname "$SCRIPT_DIR")
PROJECT_ROOT=$(dirname "$API_DIR")

YAML_FILE="/local/openapi.yaml"

echo "====================================================="
echo " Verita API Code Generation"
echo "====================================================="

# 1. Validate OpenAPI Spec using Redocly
echo "[1/3] Validating openapi.yaml..."
npx @redocly/cli lint "$API_DIR/openapi.yaml"
if [ $? -ne 0 ]; then
    echo "Validation failed. Please fix the OpenAPI spec errors."
    exit 1
fi
echo "Validation passed!"

# 2. Generate Java Spring Boot DTOs and Interfaces (Backend)
echo "[2/3] Generating Java Spring DTOs..."
docker run --rm -v "${API_DIR}:/local" -v "${PROJECT_ROOT}/backend/user-service:/output" \
    openapitools/openapi-generator-cli:latest generate \
    -i "$YAML_FILE" \
    -g spring \
    -o /output/src/main/java/com/verita/generated \
    --additional-properties=interfaceOnly=true,useSpringBoot3=true,skipDefaultInterface=true,useTags=true \
    --api-package=com.verita.userservice.api \
    --model-package=com.verita.userservice.dto

# 3. Generate TypeScript API Client (Frontend)
# Targets the React 18 / Vite stack using Axios
echo "[3/3] Generating TypeScript Axios models..."
docker run --rm -v "${API_DIR}:/local" -v "${PROJECT_ROOT}/frontend/src/api:/output" \
    openapitools/openapi-generator-cli:latest generate \
    -i "$YAML_FILE" \
    -g typescript-axios \
    -o /output/generated \
    --additional-properties=withSeparateModelsAndApi=true,apiPackage=clients,modelPackage=models

echo "====================================================="
echo " Code generation completed successfully!"
echo " Java code output: /backend/user-service/src/main/java/com/verita/generated"
echo " TypeScript code output: /frontend/src/api/generated"
echo "====================================================="