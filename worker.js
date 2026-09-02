const MEMORY_KEY = "onelink-memory";
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
  "api",
  "assets",
]);

const FLAG_HTTP = 1;
const FLAG_WWW = 2;
const FLAG_ROOT = 4;
const FLAG_COMPRESSED = 128;

function getMemoryStore() {
  if (!globalThis.__ONELINK_MEMORY__) {
    globalThis.__ONELINK_MEMORY__ = new Map();
  }
  return globalThis.__ONELINK_MEMORY__;
}

function normalizeUrl(input) {
  const trimmed = String(input || "").trim();
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

function isValidCode(code) {
  return /^[a-zA-Z0-9]{1,6}$/.test(code) && !RESERVED.has(code.toLowerCase());
}

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
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompressBytes(bytes) {
  if (typeof DecompressionStream !== "function") return null;
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function packUrlParts(urlString) {
  const u = new URL(urlString);
  let flags = 0;
  if (u.protocol === "http:") flags |= FLAG_HTTP;

  let host = u.hostname;
  if (host.startsWith("www.")) {
    flags |= FLAG_WWW;
    host = host.slice(4);
  }

  const authority = u.port ? `${host}:${u.port}` : host;
  const path = `${u.pathname}${u.search}${u.hash}`;

  if (path === "/") {
    flags |= FLAG_ROOT;
    return { flags, body: new TextEncoder().encode(authority) };
  }

  return { flags, body: new TextEncoder().encode(`${authority}\0${path}`) };
}

function unpackUrlParts(flags, bodyBytes) {
  const text = new TextDecoder().decode(bodyBytes);
  const scheme = flags & FLAG_HTTP ? "http" : "https";
  const www = flags & FLAG_WWW ? "www." : "";

  if (flags & FLAG_ROOT) {
    if (!text) return null;
    return normalizeUrl(`${scheme}://${www}${text}/`);
  }

  const sep = text.indexOf("\0");
  if (sep < 0) return null;

  const authority = text.slice(0, sep);
  if (!authority) return null;

  let path = text.slice(sep + 1);
  if (!path) path = "/";
  else if (!path.startsWith("/") && !path.startsWith("?") && !path.startsWith("#")) {
    path = `/${path}`;
  }

  return normalizeUrl(`${scheme}://${www}${authority}${path}`);
}

async function encodeDestination(url) {
  const { flags, body } = packUrlParts(url);
  const candidates = [];

  const build = (outFlags, payload) => {
    const bytes = new Uint8Array(1 + payload.length);
    bytes[0] = outFlags;
    bytes.set(payload, 1);
    return bytesToBase64Url(bytes);
  };

  candidates.push(build(flags, body));

  const compressed = await compressBytes(body);
  if (compressed && compressed.length < body.length) {
    candidates.push(build(flags | FLAG_COMPRESSED, compressed));
  }

  candidates.sort((a, b) => a.length - b.length);
  return candidates[0];
}

async function decodePacked(payload) {
  if (!/^[A-Za-z0-9_-]+$/.test(payload) || payload.length < 4) return null;

  const bytes = base64UrlToBytes(payload);
  if (bytes.length < 2) return null;

  const flags = bytes[0];
  const known = FLAG_HTTP | FLAG_WWW | FLAG_ROOT | FLAG_COMPRESSED;
  if (flags & ~known) return null;

  let body = bytes.slice(1);
  if (flags & FLAG_COMPRESSED) {
    body = (await decompressBytes(body)) || null;
    if (!body) return null;
  }
  return unpackUrlParts(flags & ~FLAG_COMPRESSED, body);
}

async function decodeLegacy(payload) {
  if (!payload || payload.length < 2) return null;
  const kind = payload[0];
  const body = payload.slice(1);
  if (kind !== "u" && kind !== "z") return null;

  try {
    const bytes = base64UrlToBytes(body);
    let decoded = bytes;
    if (kind === "z") {
      decoded = (await decompressBytes(bytes)) || bytes;
    }
    return normalizeUrl(new TextDecoder().decode(decoded));
  } catch {
    return null;
  }
}

async function decodeDestination(payload) {
  if (!payload) return null;

  try {
    const packed = await decodePacked(payload);
    if (packed) return packed;
  } catch {
    // fall through to legacy
  }

  try {
    return await decodeLegacy(payload);
  } catch {
    return null;
  }
}

function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function getStoredEntry(env, code) {
  if (env && env.LINKS) {
    const value = await env.LINKS.get(code);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  const map = getMemoryStore();
  const value = map.get(code);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function putStoredEntry(env, code, entry) {
  const payload = JSON.stringify(entry);

  if (env && env.LINKS) {
    await env.LINKS.put(code, payload);
    return;
  }

  getMemoryStore().set(code, payload);
}

function randomCode() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = new Uint32Array(6);
  crypto.getRandomValues(random);
  let value = "";
  for (const number of random) value += chars[number % chars.length];
  return value;
}

async function generateUniqueCode(env, preferred = "") {
  let candidate = preferred;
  if (!candidate) {
    candidate = randomCode();
  }

  for (let i = 0; i < 50; i += 1) {
    if (!candidate || !isValidCode(candidate)) {
      candidate = randomCode();
    }

    const entry = await getStoredEntry(env, candidate);
    if (!entry) return candidate;
    candidate = randomCode();
  }

  throw new Error("短縮コードを生成できませんでした");
}

function landingHtml() {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OneLink</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0b1020; color: #edf2ff; }
    main { box-sizing: border-box; width: min(92vw, 40rem); padding: 2rem; }
    h1 { margin-top: 0; }
    form { display: grid; gap: .75rem; }
    input, button { box-sizing: border-box; border: 0; border-radius: .6rem; padding: .85rem 1rem; font: inherit; }
    input { width: 100%; }
    button { cursor: pointer; background: #7dd3fc; color: #07111c; font-weight: 700; }
    #result { overflow-wrap: anywhere; }
    a { color: #7dd3fc; }
  </style>
</head>
<body>
  <main>
    <h1>OneLink</h1>
    <p>URLを1〜6文字の英数字コードに短縮します。</p>
    <form id="form">
      <input id="target" type="url" placeholder="https://example.com/long/path" required>
      <input id="custom" pattern="[A-Za-z0-9]{1,6}" maxlength="6" placeholder="任意のコード（1〜6文字）">
      <button>短縮する</button>
    </form>
    <p id="message" role="status"></p>
    <p id="result"></p>
  </main>
  <script>
    const form = document.getElementById("form");
    const target = document.getElementById("target");
    const custom = document.getElementById("custom");
    const message = document.getElementById("message");
    const result = document.getElementById("result");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      message.textContent = "作成中…";
      result.textContent = "";
      try {
        const response = await fetch("/api/shorten", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: target.value, custom: custom.value })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "作成に失敗しました");
        message.textContent = "短縮しました";
        result.innerHTML = '<a href="' + data.shortUrl + '">' + data.shortUrl + "</a>";
        target.value = "";
        custom.value = "";
      } catch (error) {
        message.textContent = error.message;
      }
    });
  </script>
</body>
</html>`;
}

export default {
  async fetch(request, env = {}, ctx) {
    const url = new URL(request.url);
    const rawPath = url.pathname.replace(/^\/+|\/+$/g, "");

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (rawPath === "api/health") {
      return jsonResponse(200, { ok: true, mode: env.LINKS ? "kv" : "memory" });
    }

    if (rawPath === "api/shorten") {
      if (request.method !== "POST") {
        return jsonResponse(405, { ok: false, error: "Method not allowed" });
      }

      let payload;
      try {
        payload = await request.json();
      } catch {
        return jsonResponse(400, { ok: false, error: "JSON body is required" });
      }

      const rawUrl = String(payload?.url || "").trim();
      const custom = String(payload?.custom || "").trim();
      const destination = normalizeUrl(rawUrl);
      if (!destination) {
        return jsonResponse(400, { ok: false, error: "有効な URL を入力してください" });
      }

      const candidate = custom || (await generateUniqueCode(env));
      if (custom && !isValidCode(custom)) {
        return jsonResponse(400, { ok: false, error: "カスタムコードは 1〜6 文字の英数字（大文字小文字を区別）のみです" });
      }

      const existing = await getStoredEntry(env, candidate);
      if (existing && (custom || existing.url !== destination)) {
        return jsonResponse(409, { ok: false, error: "その短縮コードは既に使われています" });
      }

      const entry = {
        url: destination,
        createdAt: new Date().toISOString(),
      };
      await putStoredEntry(env, candidate, entry);

      const shortUrl = new URL(`/${candidate}`, url.origin).toString();
      return jsonResponse(200, {
        ok: true,
        code: candidate,
        shortUrl,
        url: destination,
        mode: custom ? "vanity" : "instant",
      });
    }

    if (!rawPath) {
      return new Response(landingHtml(), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const code = rawPath;
    if (code && !code.includes(".")) {
      const stored = await getStoredEntry(env, code);
      if (stored?.url) {
        return Response.redirect(stored.url, 302);
      }

      const decoded = await decodeDestination(code);
      if (decoded) {
        return Response.redirect(decoded, 302);
      }
    }

    if (typeof env.ASSETS !== "undefined") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
