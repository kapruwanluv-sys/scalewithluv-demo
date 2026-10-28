// Local preview of site/ (no caching, so a rebuild shows at once):  node tools/serve.js [port]
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..', 'site'), port = +process.argv[2] || 8780;
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css', '.ico': 'image/x-icon'};
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root)) { res.statusCode = 403; return res.end(); }
  fs.readFile(f, (e, b) => {
    if (e) { res.statusCode = 404; return res.end('not found'); }
    res.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Content-Length': b.length});
    res.end(b);
  });
}).listen(port, () => console.log(`demo site on http://localhost:${port}`));
