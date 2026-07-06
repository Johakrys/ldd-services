// Cloudflare Pages ignora al desplegar cualquier carpeta llamada "node_modules",
// incluso dentro de dist/. Expo exporta las fuentes de @expo/vector-icons en
// dist/assets/node_modules/... => esos .ttf no se suben y los iconos salen en
// cuadraditos. Este script mueve esa carpeta a dist/assets/nm/ y reescribe las
// referencias en el bundle. Se ejecuta después de `expo export`.
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const from = path.join(dist, 'assets', 'node_modules');
const to = path.join(dist, 'assets', 'nm');

if (fs.existsSync(from)) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.renameSync(from, to);
  console.log('[fix-cf-fonts] Movido assets/node_modules -> assets/nm');
} else {
  console.log('[fix-cf-fonts] assets/node_modules no existe (ya movido?)');
}

const exts = new Set(['.js', '.html', '.css', '.json', '.map', '.txt']);
let changed = 0;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (exts.has(path.extname(p))) {
      const c = fs.readFileSync(p, 'utf8');
      if (c.includes('assets/node_modules')) {
        fs.writeFileSync(p, c.split('assets/node_modules').join('assets/nm'));
        changed++;
      }
    }
  }
}

if (fs.existsSync(dist)) walk(dist);
console.log('[fix-cf-fonts] Referencias corregidas en ' + changed + ' archivo(s)');
