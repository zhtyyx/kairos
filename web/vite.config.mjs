import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const root = fileURLToPath(new URL('./', import.meta.url));
export default defineConfig(() => {
  return {
    root, publicDir: 'public', base: '/',
    build: { outDir: '../dist-pwa', emptyOutDir: true, sourcemap: false,
      rolldownOptions: { input: { main: `${root}/index.html` } } },
    server: { host: '127.0.0.1', port: 3001, strictPort: true },
    plugins: [{ name: 'kairos-offline-shell', apply: 'build', closeBundle() {
      const out = fileURLToPath(new URL('../dist-pwa', import.meta.url));
      const projectRoot = fileURLToPath(new URL('../', import.meta.url));
      for (const name of ['LICENSE', 'docs/THIRD_PARTY_NOTICES.md']) copyFileSync(join(projectRoot, name), join(out, name.split('/').pop()));
      const paths = readdirSync(out, { recursive: true, withFileTypes: true })
        .filter(entry => entry.isFile())
        .map(entry => join(entry.parentPath, entry.name).slice(out.length).replaceAll('\\', '/'))
        .filter(path => path !== '/sw.js' && path !== '/LICENSE' && !path.endsWith('.md')).sort();
      const hash = createHash('sha256').update(readFileSync(join(root, 'public/sw.js')));
      for (const path of paths) hash.update(readFileSync(join(out, path)));
      const sw = readFileSync(join(root, 'public/sw.js'), 'utf8')
        .replace('__BUILD_ID__', hash.digest('hex').slice(0, 16))
        .replace('__PRECACHE_ASSETS__', JSON.stringify(paths));
      writeFileSync(join(out, 'sw.js'), sw);
    } }],
  };
});
