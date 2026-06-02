let allHighlights = [];

const list = document.getElementById("highlights-list");
const searchInput = document.getElementById("search");

// ── Utilities ──────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    + " · "
    + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function csvCell(val) {
  return '"' + String(val == null ? "" : val).replace(/"/g, '""') + '"';
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Render ─────────────────────────────────────────────────────────────────

function getFiltered() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return allHighlights;
  return allHighlights.filter((h) =>
    h.text.toLowerCase().includes(q) ||
    (h.pageTitle || "").toLowerCase().includes(q)
  );
}

function render(highlights) {
  list.innerHTML = "";

  if (allHighlights.length === 0) {
    list.innerHTML = '<p class="empty">No highlights yet.<br>Select text on any page and right-click to save.</p>';
    return;
  }

  if (highlights.length === 0) {
    list.innerHTML = `<p class="empty">No highlights match <strong>${escapeHtml(searchInput.value.trim())}</strong>.</p>`;
    return;
  }

  highlights.forEach((h) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <p class="page-title">${escapeHtml(h.pageTitle || h.url)}</p>
      <p class="highlight-text">${escapeHtml(h.text)}</p>
      <p class="date">${escapeHtml(formatDate(h.createdAt))}</p>
      <div class="actions">
        <button class="btn btn-copy" data-id="${h.id}" data-text="${escapeAttr(h.text)}">Copy</button>
        <button class="btn btn-source" data-url="${escapeAttr(h.url)}">Open Source</button>
        <button class="btn btn-delete" data-id="${h.id}">Delete</button>
      </div>
    `;
    list.appendChild(card);
  });
}

function loadAndRender() {
  chrome.storage.local.get({ highlights: [] }, (result) => {
    allHighlights = result.highlights;
    render(getFiltered());
  });
}

// ── Search ─────────────────────────────────────────────────────────────────

searchInput.addEventListener("input", () => {
  render(getFiltered());
});

// ── Card actions (delegated) ───────────────────────────────────────────────

list.addEventListener("click", (e) => {
  const copyBtn = e.target.closest(".btn-copy");
  const sourceBtn = e.target.closest(".btn-source");
  const deleteBtn = e.target.closest(".btn-delete");

  if (copyBtn) {
    navigator.clipboard.writeText(copyBtn.dataset.text).then(() => {
      copyBtn.textContent = "Copied!";
      copyBtn.disabled = true;
      setTimeout(() => {
        copyBtn.textContent = "Copy";
        copyBtn.disabled = false;
      }, 1500);
    });
  }

  if (sourceBtn) {
    const url = sourceBtn.dataset.url;
    if (url) window.open(url, "_blank");
  }

  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    chrome.storage.local.get({ highlights: [] }, (result) => {
      const updated = result.highlights.filter((h) => h.id !== id);
      chrome.storage.local.set({ highlights: updated }, loadAndRender);
    });
  }
});

// ── Toolbar actions ────────────────────────────────────────────────────────

document.getElementById("btn-clear-all").addEventListener("click", () => {
  if (!confirm("Delete all highlights? This cannot be undone.")) return;
  chrome.storage.local.set({ highlights: [] }, loadAndRender);
});

document.getElementById("btn-export-json").addEventListener("click", () => {
  const blob = new Blob(
    [JSON.stringify(allHighlights, null, 2)],
    { type: "application/json" }
  );
  triggerDownload(blob, "highlights.json");
});

document.getElementById("btn-export-csv").addEventListener("click", () => {
  const headers = ["id", "text", "url", "pageTitle", "createdAt"];
  const rows = allHighlights.map((h) =>
    headers.map((k) => csvCell(h[k])).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv" });
  triggerDownload(blob, "highlights.csv");
});

// ── Init ───────────────────────────────────────────────────────────────────

loadAndRender();
