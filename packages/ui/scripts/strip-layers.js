import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cssPath = resolve(__dirname, '../dist/tailwind.css');

let css = readFileSync(cssPath, 'utf-8');

function stripLayers(input) {
  let result = '';
  let i = 0;

  while (i < input.length) {
    const emptyLayerMatch = input.slice(i).match(/^@layer\s+[\w-]+\s*;/);
    if (emptyLayerMatch) {
      i += emptyLayerMatch[0].length;
      continue;
    }

    const layerMatch = input.slice(i).match(/^@layer\s+[\w-]+\s*\{/);
    if (layerMatch) {
      i += layerMatch[0].length;
      let braceCount = 1;
      let content = '';

      while (i < input.length && braceCount > 0) {
        if (input[i] === '{') braceCount++;
        else if (input[i] === '}') braceCount--;

        if (braceCount > 0) content += input[i];
        i++;
      }

      result += content;
    } else {
      result += input[i];
      i++;
    }
  }

  return result;
}

css = stripLayers(css);

writeFileSync(cssPath, css, 'utf-8');
console.log('Stripped @layer wrappers from CSS');
