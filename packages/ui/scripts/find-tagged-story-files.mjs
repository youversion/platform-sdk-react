import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const tag = process.argv[2];
if (!tag) throw new Error('story tag is required');

function findTaggedStories(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findTaggedStories(path);
    if (!/\.stories\.tsx?$/.test(entry.name)) return [];

    const source = readFileSync(path, 'utf8');
    return source.includes(`'${tag}'`) || source.includes(`"${tag}"`) ? [path] : [];
  });
}

process.stdout.write(findTaggedStories('src').sort().join('\n'));
