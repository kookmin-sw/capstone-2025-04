#!/bin/bash

# This script reorganizes the chains, prompts, and schemas into a folder structure by chain

cd "$(dirname "$0")"
SRC_DIR="src"

# List of chains
CHAINS=("testDesign" "intentAnalysis" "validation" "solutionGen" "title" "translation" "description" "testGen" "constraints")

# Create directory structure
for CHAIN in "${CHAINS[@]}"; do
  mkdir -p "$SRC_DIR/chains/$CHAIN"
  
  # Copy chain logic
  if [ -f "$SRC_DIR/chains/$CHAIN.mjs" ]; then
    cp "$SRC_DIR/chains/$CHAIN.mjs" "$SRC_DIR/chains/$CHAIN/index.mjs"
  else
    echo "Warning: Chain file $SRC_DIR/chains/$CHAIN.mjs not found"
  fi
  
  # Copy prompt
  if [ -f "$SRC_DIR/prompts/$CHAIN.mjs" ]; then
    cp "$SRC_DIR/prompts/$CHAIN.mjs" "$SRC_DIR/chains/$CHAIN/prompt.mjs"
  else
    echo "Warning: Prompt file $SRC_DIR/prompts/$CHAIN.mjs not found"
  fi
  
  # Copy schema
  if [ -f "$SRC_DIR/schemas/$CHAIN.mjs" ]; then
    cp "$SRC_DIR/schemas/$CHAIN.mjs" "$SRC_DIR/chains/$CHAIN/schema.mjs"
  else
    echo "Warning: Schema file $SRC_DIR/schemas/$CHAIN.mjs not found"
  fi
  
  # Update imports in the index.mjs file
  if [ -f "$SRC_DIR/chains/$CHAIN/index.mjs" ]; then
    # Update import paths
    sed -i '' -e "s|\"../prompts/$CHAIN.mjs\"|\"./prompt.mjs\"|g" "$SRC_DIR/chains/$CHAIN/index.mjs"
    sed -i '' -e "s|\"../schemas/[^\"]*\"|\"./schema.mjs\"|g" "$SRC_DIR/chains/$CHAIN/index.mjs"
  fi
done

# Update the main chains/index.mjs barrel file
cat > "$SRC_DIR/chains/index.mjs" << EOF
// Barrel file for exporting all chain modules
export * from "./testDesign/index.mjs";
export * from "./intentAnalysis/index.mjs";
export * from "./solutionGen/index.mjs";
export * from "./testGen/index.mjs";
export * from "./validation/index.mjs";
export * from "./constraints/index.mjs";
export * from "./description/index.mjs";
export * from "./title/index.mjs";
export * from "./translation/index.mjs";
EOF

echo "Reorganization complete. Please verify the changes before removing the old files."
echo "After verification, you can remove the old files with:"
echo "rm $SRC_DIR/chains/*.mjs"
echo "rm -rf $SRC_DIR/prompts"
echo "rm -rf $SRC_DIR/schemas" 