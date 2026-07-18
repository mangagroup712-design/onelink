const PUBLIC_ORIGIN = "https://onelink.f5.si";
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
]);

const alphabet =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function randomCode(length = 7) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) {
    out += alphabet[b % alphabet.length];
  }
  return out;
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
  return `${PUBLIC_ORIGIN}/${code}`;
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

export function createUniqueCode(existing) {
  for (let i = 0; i < 20; i += 1) {
    const code = randomCode();
    if (!existing[code] && isValidCode(code)) return code;
  }
  throw new Error("ユニークなコードを生成できませんでした");
}

export { PUBLIC_ORIGIN };
