// Servidor local: compila el sitio, recompila al guardar cambios en src/ o build.js
// y sirve dist/ en http://localhost:4321
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 4321;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function build() {
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'build.js')], { stdio: 'inherit' });
  } catch {
    console.error('La compilación falló; revisa el error de arriba.');
  }
}

build();
let timer;
const rebuild = () => { clearTimeout(timer); timer = setTimeout(build, 150); };
fs.watch(path.join(__dirname, 'src'), { recursive: true }, rebuild);
fs.watch(path.join(__dirname, 'build.js'), rebuild);

http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = path.join(ROOT, pathname);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) {
    const notFound = path.join(ROOT, '404.html');
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    return res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'Not found');
  }
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Sitio en http://localhost:${PORT}`));
