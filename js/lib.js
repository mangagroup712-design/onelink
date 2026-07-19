const PUBLIC_ORIGIN = "https://1lk.f5.si";
const STORAGE_KEY = "onelink-pending";
const RESERVED = new Set([
  "css",
  "js",
  "index",
  "index.html",
  "404",
  "404.html",
  "links.json",
  "cname",
  "favicon.ico",
  "robots.txt",
  "demo",
  "og.png",
]);

function bytesToBase64Url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(text) {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const bin = atob(padded + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function compressBytes(bytes) {
  if (typeof CompressionStream !== "function") return null;
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompressBytes(bytes) {
  if (typeof DecompressionStream !== "function") return null;
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function publicOrigin() {
  if (
    typeof location !== "undefined" &&
    /^(localhost|127\.0\.0\.1)$/i.test(location.hostname)
  ) {
    return location.origin;
  }
  return PUBLIC_ORIGIN;
}

export function normalizeUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function isValidCode(code) {
  return (
    /^[a-zA-Z0-9_-]{3,32}$/.test(code) && !RESERVED.has(code.toLowerCase())
  );
}

export async function encodeDestination(url) {
  const raw = new TextEncoder().encode(url);
  const compressed = await compressBytes(raw);
  if (compressed && compressed.length < raw.length) {
    return `z${bytesToBase64Url(compressed)}`;
  }
  return `u${bytesToBase64Url(raw)}`;
}

export async function decodeDestination(payload) {
  if (!payload || payload.length < 2) return null;
  const kind = payload[0];
  const body = payload.slice(1);

  try {
    const bytes = base64UrlToBytes(body);
    let decoded = bytes;
    if (kind === "z") {
      decoded = (await decompressBytes(bytes)) || bytes;
    } else if (kind !== "u") {
      return null;
    }
    const url = new TextDecoder().decode(decoded);
    return normalizeUrl(url);
  } catch {
    return null;
  }
}

export async function loadLinks() {
  const res = await fetch("/links.json", { cache: "no-store" });
  if (!res.ok) return {};
  const data = await res.json();
  return data && typeof data === "object" ? data : {};
}

export function loadPending() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePending(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function mergeLinks(published, pending) {
  return { ...published, ...pending };
}

export function shortUrlFor(code) {
  return `${publicOrigin()}/${code}`;
}

export function instantShortUrl(payload) {
  return `${publicOrigin()}/~${payload}`;
}

export function redirectHtml(destination) {
  const safe = destination
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${safe}">
  <link rel="canonical" href="${safe}">
  <title>Redirecting…</title>
  <script>location.replace(${JSON.stringify(destination)});</script>
</head>
<body>
  <p>Redirecting to <a href="${safe}">${safe}</a>…</p>
</body>
</html>
`;
}

export { PUBLIC_ORIGIN };
