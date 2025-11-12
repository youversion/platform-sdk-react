#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Generating TypeScript declarations...');

// Create a temporary tsconfig for declaration generation
const tmpTsConfig = {
  extends: './tsconfig.json',
  compilerOptions: {
    outDir: 'dist',
    declaration: true,
    emitDeclarationOnly: true,
    rootDir: '.',
    baseUrl: '.',
  },
  include: ['src/**/*'],
};

fs.writeFileSync('tsconfig.types.json', JSON.stringify(tmpTsConfig, null, 2));

try {
  execSync('tsc -p tsconfig.types.json', { stdio: 'inherit' });

  console.log('TypeScript declarations generated in dist/');

  console.log('TypeScript declarations generated successfully!');
} catch (error) {
  console.error('Failed to generate TypeScript declarations:', error.message);
  process.exit(1);
} finally {
  // Clean up temporary config
  fs.unlinkSync('tsconfig.types.json');
}
