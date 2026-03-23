import http from 'node:http';
import { createReadStream, stat } from 'node:fs';
import { extname, resolve } from 'node:path';

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = resolve(process.env.UPDATE_SERVER_ROOT || 'updates');

const CONTENT_TYPES = {
  '.yml': 'text/yaml; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.exe': 'application/x-msdownload',
  '.blockmap': 'application/octet-stream',
  '.json': 'application/json; charset=utf-8',
  '.zip': 'application/zip',
};

function getContentType(filePath) {
  return CONTENT_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function sendNotFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}

function sendMethodNotAllowed(res) {
  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Method not allowed');
}

function resolveFilePath(urlPath) {
  const safePath = urlPath.replace(/\0/g, '');
  const resolved = resolve(ROOT_DIR, `.${safePath}`);
  if (!resolved.startsWith(ROOT_DIR)) {
    return null;
  }
  return resolved;
}

function parseRangeHeader(rangeHeader, size) {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) return null;
  const range = rangeHeader.replace('bytes=', '').split('-');
  const start = range[0] ? Number(range[0]) : 0;
  const end = range[1] ? Number(range[1]) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start < 0) {
    return null;
  }
  return { start, end: Math.min(end, size - 1) };
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    sendNotFound(res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendMethodNotAllowed(res);
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const filePath = resolveFilePath(decodeURIComponent(requestUrl.pathname));
  if (!filePath) {
    sendNotFound(res);
    return;
  }

  stat(filePath, (err, fileStat) => {
    if (err || !fileStat.isFile()) {
      sendNotFound(res);
      return;
    }

    const range = parseRangeHeader(req.headers.range, fileStat.size);
    const headers = {
      'Content-Type': getContentType(filePath),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
      'Last-Modified': fileStat.mtime.toUTCString(),
    };

    if (range) {
      headers['Content-Range'] = `bytes ${range.start}-${range.end}/${fileStat.size}`;
      headers['Content-Length'] = String(range.end - range.start + 1);
      res.writeHead(206, headers);
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      createReadStream(filePath, { start: range.start, end: range.end }).pipe(res);
      return;
    }

    headers['Content-Length'] = String(fileStat.size);
    res.writeHead(200, headers);
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[update-server] Serving ${ROOT_DIR}`);
  console.log(`[update-server] http://${HOST}:${PORT}`);
});
