#!/bin/bash

echo "=== DEBUG START ==="
pwd
echo "Current directory contents:"
ls -la
echo "Checking for package.json:"
cat package.json | head -20
echo "Navigating to repo root..."
cd ../..
pwd
echo "Root directory contents:"
ls -la
echo "Installing dependencies..."
pnpm install --frozen-lockfile
echo "Building workspace packages..."
pnpm build
echo "Returning to NextJS directory..."
cd examples/nextjs
pwd
echo "NextJS directory contents:"
ls -la
echo "Building NextJS app with static export..."
pnpm build
echo "Build complete! Output directory contents:"
ls -la out/