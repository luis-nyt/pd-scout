import { defineConfig } from 'tsup';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export default defineConfig({
  entry: ['src/cli/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  shims: true,
  // Make the CLI executable
  banner: {
    js: '#!/usr/bin/env node',
  },
  // Copy YAML files after build
  async onSuccess() {
    const copyYamlFiles = (srcDir: string, destDir: string) => {
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
  },
});

