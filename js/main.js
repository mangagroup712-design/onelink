import {
  createUniqueCode,
  isValidCode,
  loadLinks,
  loadPending,
  mergeLinks,
  normalizeUrl,
  redirectHtml,
  savePending,
  shortUrlFor,
} from "./lib.js";

const form = document.getElementById("shorten-form");
const urlInput = document.getElementById("url");
const customToggle = document.getElementById("custom-toggle");
const customField = document.getElementById("custom-field");
const customCodeInput = document.getElementById("custom-code");
const banner = document.getElementById("banner");
const result = document.getElementById("result");
const shortUrlEl = document.getElementById("short-url");
const resultMeta = document.getElementById("result-meta");
const copyBtn = document.getElementById("copy-btn");
const downloadBtn = document.getElementById("download-btn");
const submitBtn = document.getElementById("submit-btn");

let lastCreated = null;

function showBanner(message, type = "error") {
  banner.textContent = message;
  banner.className = `banner ${type}`;
  banner.classList.remove("hidden");
}

function hideBanner() {
  banner.classList.add("hidden");
}

function showResult(entry) {
  lastCreated = entry;
  const shortUrl = shortUrlFor(entry.code);
  shortUrlEl.href = shortUrl;
  shortUrlEl.textContent = shortUrl;
  resultMeta.textContent = `行き先: ${entry.url}`;
  result.classList.remove("hidden");
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

customToggle.addEventListener("click", () => {
  const open = customField.classList.toggle("hidden");
  customToggle.textContent = open
    ? "カスタムコードを使う"
    : "カスタムコードを隠す";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideBanner();
  result.classList.add("hidden");

  const normalized = normalizeUrl(urlInput.value);
  if (!normalized) {
    showBanner("有効な URL を入力してください（例: https://example.com）");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "作成中…";

  try {
    const published = await loadLinks();
    const pending = loadPending();
    const existing = mergeLinks(published, pending);

    let code = customCodeInput.value.trim();
    const useCustom = !customField.classList.contains("hidden") && code;

    if (useCustom) {
      if (!isValidCode(code)) {
        showBanner(
          "カスタムコードは 3〜32 文字の英数字・ハイフン・アンダースコアのみです",
        );
        return;
      }
      if (existing[code]) {
        showBanner("そのカスタムコードは既に使われています");
        return;
      }
    } else {
      code = createUniqueCode(existing);
    }

    const entry = {
      url: normalized,
      createdAt: new Date().toISOString(),
    };

    pending[code] = entry;
    savePending(pending);

    showResult({ code, ...entry });
    showBanner(
      "ブラウザ上では作成済みです。本番反映にはファイルをダウンロードして Push してください。",
      "warn",
    );
    urlInput.value = "";
    customCodeInput.value = "";
  } catch (err) {
    showBanner(err.message || "作成に失敗しました");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "短縮する";
  }
});

copyBtn.addEventListener("click", async () => {
  if (!lastCreated) return;
  try {
    await navigator.clipboard.writeText(shortUrlFor(lastCreated.code));
    copyBtn.textContent = "コピー済み";
    setTimeout(() => {
      copyBtn.textContent = "コピー";
    }, 1600);
  } catch {
    showBanner("コピーに失敗しました。リンクを手動で選択してください。");
  }
});

downloadBtn.addEventListener("click", async () => {
  if (!lastCreated) return;
  const published = await loadLinks();
  const pending = loadPending();
  const merged = mergeLinks(published, pending);

  downloadText("links.json", `${JSON.stringify(merged, null, 2)}\n`);
  downloadText(
    `${lastCreated.code}__index.html`,
    redirectHtml(lastCreated.url),
  );

  showBanner(
    `links.json でリポジトリの同名ファイルを上書きし、${lastCreated.code}__index.html を ${lastCreated.code}/index.html として配置して Push してください。`,
    "ok",
  );
});

const params = new URLSearchParams(location.search);
if (params.get("missing") === "1") {
  showBanner("その短縮リンクは見つかりませんでした。", "warn");
  history.replaceState({}, "", "/");
}
