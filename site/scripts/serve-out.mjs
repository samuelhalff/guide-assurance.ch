#!/usr/bin/env node
// Serveur statique minimal pour Lighthouse CI : sert site/out comme le proxy nginx de production
// (infra/proxy-extra/guide-assurance.conf) : try_files $uri $uri/ $uri.html =404, index index.html,
// 301 vers la barre finale pour un dossier, page 404.html avec statut 404, gzip (niveau 5, >= 1024 octets,
// mêmes types), cache long sur /_next/static/ et en-têtes de sécurité du bloc server (dont la CSP).
// Sans dépendance. Usage : node scripts/serve-out.mjs [port] (défaut 4173, ou PORT).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../out/", import.meta.url));
const PORT = Number(process.argv[2] || process.env.PORT || 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".csv": "text/csv",
  ".ics": "text/calendar",
  ".pdf": "application/pdf",
};
// nginx gzip_types (text/html est toujours compressé par nginx).
const GZIP = new Set(["text/html", "text/plain", "text/css", "text/xml", "application/javascript", "application/json", "application/xml", "image/svg+xml", "application/manifest+json"]);

const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com; frame-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com; connect-src 'self' https://eu.i.posthog.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

async function isFile(p) {
  try { return (await stat(p)).isFile(); } catch { return false; }
}
async function isDir(p) {
  try { return (await stat(p)).isDirectory(); } catch { return false; }
}

async function send(req, res, file, status = 200, pathname = "") {
  const body = await readFile(file);
  const type = TYPES[extname(file).toLowerCase()] || "application/octet-stream";
  const headers = { ...SECURITY, "Content-Type": type };
  if (pathname.startsWith("/_next/static/")) headers["Cache-Control"] = "max-age=31536000";
  else if (pathname.startsWith("/brand/")) headers["Cache-Control"] = "max-age=2592000";
  let out = body;
  if (GZIP.has(type.split(";")[0]) && body.length >= 1024) {
    headers["Vary"] = "Accept-Encoding";
    if (/\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
      out = gzipSync(body, { level: 5 });
      headers["Content-Encoding"] = "gzip";
    }
  }
  headers["Content-Length"] = out.length;
  res.writeHead(status, headers);
  res.end(req.method === "HEAD" ? undefined : out);
}

async function notFound(req, res) {
  const page = join(ROOT, "404.html");
  if (await isFile(page)) return send(req, res, page, 404);
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
}

const server = createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405); return res.end();
    }
    const url = new URL(req.url, "http://localhost");
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { return notFound(req, res); }
    const target = normalize(join(ROOT, pathname));
    if (target !== ROOT.slice(0, -1) && !target.startsWith(ROOT)) return notFound(req, res);

    // try_files $uri
    if (!pathname.endsWith("/") && (await isFile(target))) return send(req, res, target, 200, pathname);
    // try_files $uri/ (index index.html ; nginx redirige d'abord vers la barre finale)
    if (await isDir(target)) {
      if (!pathname.endsWith("/")) {
        res.writeHead(301, { Location: pathname + "/" + url.search });
        return res.end();
      }
      const index = join(target, "index.html");
      if (await isFile(index)) return send(req, res, index, 200, pathname);
    }
    // try_files $uri.html
    if (!pathname.endsWith("/") && (await isFile(target + ".html"))) return send(req, res, target + ".html", 200, pathname);
    return notFound(req, res);
  } catch (err) {
    res.writeHead(500); res.end(String(err));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`serve-out: listening on http://127.0.0.1:${PORT}/ (root ${ROOT})`);
});
