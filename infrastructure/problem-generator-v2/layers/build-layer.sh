#!/bin/bash
set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
LAMBDA_DIR="$SCRIPT_DIR/../../../backend/lambdas/problem-generator-v2"
REQUIREMENTS_FILE="$LAMBDA_DIR/requirements.txt"
DOCKERFILE="$SCRIPT_DIR/Dockerfile.build"
OUTPUT_DIR="$SCRIPT_DIR/lambda_layer_out"
LAYER_ZIP_FILE="$SCRIPT_DIR/problem_generator_deps.zip"

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Copy requirements.txt for Docker build context
tmp_build_dir="$SCRIPT_DIR/tmp_build_ctx"
rm -rf "$tmp_build_dir"
mkdir -p "$tmp_build_dir"
cp "$REQUIREMENTS_FILE" "$tmp_build_dir/requirements.txt"
cp "$DOCKERFILE" "$tmp_build_dir/Dockerfile.build"

# Build Docker image
docker build -t lambda-layer-builder -f "$tmp_build_dir/Dockerfile.build" "$tmp_build_dir"

# Create container
CONTAINER_ID=$(docker create lambda-layer-builder)

docker cp "$CONTAINER_ID:/opt/." "$OUTPUT_DIR/"
docker rm "$CONTAINER_ID"

# Zip the layer
cd "$OUTPUT_DIR"
zip -qr "$LAYER_ZIP_FILE" .
cd "$SCRIPT_DIR"

rm -rf "$OUTPUT_DIR" "$tmp_build_dir"

echo "Lambda layer zip file created at $LAYER_ZIP_FILE"
