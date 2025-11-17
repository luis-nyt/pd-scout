#!/usr/bin/env node

import { copyFileSync, mkdirSync, readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Copy YAML files
const copyYamlFiles = (srcDir, destDir) => {
  if (!existsSync(srcDir)) return 0;
  
  mkdirSync(destDir, { recursive: true });
  const files = readdirSync(srcDir);
  let count = 0;
  
  for (const file of files) {
    if (file.endsWith('.yaml')) {
      copyFileSync(join(srcDir, file), join(destDir, file));
      count++;
    }
  }
  return count;
};

const patternCount = copyYamlFiles('src/patterns/builtin', 'dist/patterns/builtin');
const templateCount = copyYamlFiles('src/templates/builtin', 'dist/templates/builtin');

console.log(`Copied ${patternCount + templateCount} YAML files to dist/`);

// Add shebang to CLI file
const cliFile = 'dist/cli/index.js';
if (existsSync(cliFile)) {
  const content = readFileSync(cliFile, 'utf-8');
  if (!content.startsWith('#!')) {
    writeFileSync(cliFile, `#!/usr/bin/env node\n${content}`);
    console.log('Added shebang to CLI file');
  }
}

