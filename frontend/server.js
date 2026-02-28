const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// FORÇAR MODO PRODUÇÃO: CPanel muitas vezes injeta NODE_ENV="development",
// o que faz o Next.js ignorar o build e tentar compilar on-the-fly, falhando ou rodando código antigo.
const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
