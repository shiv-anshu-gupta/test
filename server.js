#!/usr/bin/env node

/**
 * Simple HTTP Server for COMTRADE Viewer
 *
 * Usage:
 *   node server.js
 *
 * Then open: http://localhost:8000
 */

import http from "http";
import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(
  new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")
);
const PORT = process.env.PORT || 8000;

const server = http.createServer((req, res) => {
  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Default to index.html
  if (pathname === "/" || pathname === "") {
    pathname = "/index.html";
  }

  // Resolve file path
  const filePath = path.join(__dirname, pathname);

  // Check if path tries to escape root
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  // Try to read file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404: File Not Found");
      } else {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("500: Server Error");
      }
      return;
    }

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    let contentType = "application/octet-stream";

    switch (ext) {
      case ".html":
        contentType = "text/html; charset=utf-8";
        break;
      case ".css":
        contentType = "text/css; charset=utf-8";
        break;
      case ".js":
        contentType = "application/javascript; charset=utf-8";
        break;
      case ".json":
        contentType = "application/json; charset=utf-8";
        break;
      case ".mmd":
        contentType = "text/plain; charset=utf-8";
        break;
      case ".svg":
        contentType = "image/svg+xml";
        break;
      case ".png":
        contentType = "image/png";
        break;
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg";
        break;
      case ".gif":
        contentType = "image/gif";
        break;
      case ".ico":
        contentType = "image/x-icon";
        break;
      case ".woff":
        contentType = "font/woff";
        break;
      case ".woff2":
        contentType = "font/woff2";
        break;
      case ".ttf":
        contentType = "font/ttf";
        break;
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
    });
    res.end(content);
  });
});

server.listen(PORT, "localhost", () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          COMTRADE Viewer Development Server               ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Server running at: http://localhost:${PORT}${" ".repeat(
    String(PORT).length > 4 ? 0 : 4 - String(PORT).length
  )}              ║
║                                                            ║
║  Ready to test:                                            ║
║  ✓ Vertical line interpolation                            ║
║  ✓ Delta calculations                                     ║
║  ✓ Multi-chart synchronization                            ║
║                                                            ║
║  Steps:                                                   ║
║  1. Open http://localhost:${PORT} in browser               ║
║  2. Load a COMTRADE file (CFG + DAT)                      ║
║  3. Click on chart to add vertical lines                  ║
║  4. Drag lines to test deltas                             ║
║                                                            ║
║  Press Ctrl+C to stop server                              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.error(`Try: PORT=8001 node server.js\n`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\nShutting down server...");
  server.close(() => {
    console.log("Server stopped.");
    process.exit(0);
  });
});
