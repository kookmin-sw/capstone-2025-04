#!/bin/bash
# capstone-2025-04/infrastructure/problem-generator-v2/layers/build-layer.sh
set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
LAMBDA_DIR="$SCRIPT_DIR/../../../backend/lambdas/problem-generator-v2"
PACKAGE_JSON="$LAMBDA_DIR/package.json"
PACKAGE_LOCK_JSON="$LAMBDA_DIR/package-lock.json" # Use package-lock.json
DOCKERFILE="$SCRIPT_DIR/Dockerfile.build"
OUTPUT_DIR="$SCRIPT_DIR/lambda_layer_out" # Temp dir for layer contents
LAYER_ZIP_FILE="$SCRIPT_DIR/problem_generator_deps.zip" # Final zip output

# Ensure source package files exist
if [ ! -f "$PACKAGE_JSON" ]; then
    echo "Error: package.json not found at $PACKAGE_JSON"
    exit 1
fi
if [ ! -f "$PACKAGE_LOCK_JSON" ]; then
    echo "Error: package-lock.json not found at $PACKAGE_LOCK_JSON"
    echo "Please run 'npm install' in $LAMBDA_DIR first."
    exit 1
fi


# Cleanup previous build artifacts
rm -rf "$OUTPUT_DIR"
rm -f "$LAYER_ZIP_FILE"
mkdir -p "$OUTPUT_DIR"

# Copy files needed for Docker build context
tmp_build_dir="$SCRIPT_DIR/tmp_build_ctx"
rm -rf "$tmp_build_dir"
mkdir -p "$tmp_build_dir"
cp "$PACKAGE_JSON" "$tmp_build_dir/package.json"
cp "$PACKAGE_LOCK_JSON" "$tmp_build_dir/package-lock.json"
cp "$DOCKERFILE" "$tmp_build_dir/Dockerfile.build"

# Build Docker image
echo "Building Lambda layer Docker image..."
docker build -t problem-generator-layer-builder -f "$tmp_build_dir/Dockerfile.build" "$tmp_build_dir"

# Create container from the built image
echo "Creating container..."
CONTAINER_ID=$(docker create problem-generator-layer-builder)

# Copy the installed dependencies from the correct path inside the container
# Lambda Node.js layers expect contents in `/opt/nodejs/node_modules`
echo "Copying dependencies from container..."
# Copy the nodejs directory which contains node_modules
docker cp "$CONTAINER_ID:/opt/nodejs" "$OUTPUT_DIR/"

# Clean up the container
echo "Removing container..."
docker rm "$CONTAINER_ID"

# Zip the contents (the nodejs directory)
echo "Creating layer zip file..."
cd "$OUTPUT_DIR" # Go into the temp output directory
zip -qr "$LAYER_ZIP_FILE" nodejs # Zip the nodejs directory
cd "$SCRIPT_DIR" # Return to original script directory

# Clean up temporary directories
echo "Cleaning up temporary build files..."
rm -rf "$OUTPUT_DIR" "$tmp_build_dir"

echo "✅ Lambda layer zip file created successfully at $LAYER_ZIP_FILE"
