const http = require("http");
const fs = require("fs");
const path = require("path");

const appDir = __dirname;
const publicDir = path.join(appDir, "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".onnx": "application/octet-stream",
  ".data": "application/octet-stream",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function setDefaultHeaders(res) {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Access-Control-Allow-Origin", "*");
}

function resolvePath(urlPath) {
  if (urlPath === "/") {
    return path.join(publicDir, "index.html");
  }

  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const publicPath = path.join(publicDir, cleanPath);
  if (fs.existsSync(publicPath)) {
    return publicPath;
  }

  return path.join(appDir, cleanPath);
}

function serveFile(res, filePath) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";

    setDefaultHeaders(res);
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stat.size,
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const filePath = resolvePath(req.url || "/");
  serveFile(res, filePath);
});

const port = Number(process.env.PORT) || 4173;
server.listen(port, () => {
  console.log(`Epicrisis app running at http://localhost:${port}`);
});
