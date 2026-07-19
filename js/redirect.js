import {
  decodeDestination,
  loadLinks,
  loadPending,
  mergeLinks,
} from "./lib.js";

const titleEl = document.getElementById("status-title");
const textEl = document.getElementById("status-text");
const homeLink = document.getElementById("home-link");

function notFound(message) {
  titleEl.textContent = "リンクが見つかりません";
  textEl.textContent = message;
  homeLink.classList.remove("hidden");
}

function pathToken() {
  const raw = location.pathname.replace(/^\/+|\/+$/g, "");
  if (!raw) return null;
  if (raw.includes("/")) return null;
  return raw;
}

async function main() {
  const token = pathToken();

  if (!token) {
    location.replace("/");
    return;
  }

  try {
    if (token.startsWith("~") && token.length > 1) {
      const url = await decodeDestination(token.slice(1));
      if (!url) {
        notFound("この短縮リンクは壊れているか、形式が正しくありません。");
        return;
      }
      titleEl.textContent = "移動しています…";
      textEl.textContent = url;
      location.replace(url);
      return;
    }

    if (token.includes(".")) {
      location.replace("/");
      return;
    }

    const published = await loadLinks();
    const pending = loadPending();
    const links = mergeLinks(published, pending);
    const entry = links[token];

    if (!entry || !entry.url) {
      notFound(`「${token}」は登録されていないか、まだ公開前です。`);
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
