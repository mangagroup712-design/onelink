import { loadLinks, loadPending, mergeLinks } from "./lib.js";

const titleEl = document.getElementById("status-title");
const textEl = document.getElementById("status-text");
const homeLink = document.getElementById("home-link");

function notFound(message) {
  titleEl.textContent = "リンクが見つかりません";
  textEl.textContent = message;
  homeLink.classList.remove("hidden");
}

function codeFromPath() {
  const raw = location.pathname.replace(/^\/+|\/+$/g, "");
  if (!raw) return null;
  if (raw.includes(".") || raw.includes("/")) return null;
  return raw;
}

async function main() {
  const code = codeFromPath();

  if (!code) {
    location.replace("/");
    return;
  }

  try {
    const published = await loadLinks();
    const pending = loadPending();
    const links = mergeLinks(published, pending);
    const entry = links[code];

    if (!entry || !entry.url) {
      notFound(`「${code}」は登録されていないか、まだ公開前です。`);
      return;
    }

    titleEl.textContent = "移動しています…";
    textEl.textContent = entry.url;
    location.replace(entry.url);
  } catch {
    notFound("リンク情報の読み込みに失敗しました。");
  }
}

main();
