const TAGS = ["School", "Work", "Research", "Personal", "Other"];

let allHighlights = [];
let selectedTag = "All";
let sortOrder = "newest";

const list = document.getElementById("highlights-list");
const searchInput = document.getElementById("search");
const tagFilter = document.getElementById("tag-filter");
const statsBar = document.getElementById("stats-bar");
const sortSelect = document.getElementById("sort-select");

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

// ── Stats ──────────────────────────────────────────────────────────────────

function renderStats() {
  if (allHighlights.length === 0) {
    statsBar.innerHTML = "";
    return;
  }

  const counts = {};
  let starred = 0;
  TAGS.forEach((t) => (counts[t] = 0));

  allHighlights.forEach((h) => {
    const tag = h.tag || "Other";
    counts[tag] = (counts[tag] || 0) + 1;
    if (h.favorite) starred++;
  });

  let html = `<span class="stat-chip stat-total">${allHighlights.length} total</span>`;
  TAGS.forEach((t) => {
    if (counts[t] > 0) {
      html += `<span class="stat-chip" data-tag="${t}">${counts[t]} ${t}</span>`;
    }
  });
  if (starred > 0) {
    html += `<span class="stat-chip stat-starred">${starred} starred</span>`;
  }

  statsBar.innerHTML = html;
}

// ── Filter & Sort ──────────────────────────────────────────────────────────

function getFiltered() {
  const q = searchInput.value.trim().toLowerCase();
  return allHighlights.filter((h) => {
    const tag = h.tag || "Other";

    let matchesFilter;
    if (selectedTag === "All")        matchesFilter = true;
    else if (selectedTag === "Starred") matchesFilter = !!h.favorite;
    else                              matchesFilter = tag === selectedTag;

    const matchesSearch = !q
      || h.text.toLowerCase().includes(q)
      || (h.pageTitle || "").toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });
}

function getSorted(highlights) {
  const arr = [...highlights];
  if (sortOrder === "oldest") {
    return arr.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  }
  if (sortOrder === "az") {
    return arr.sort((a, b) => (a.pageTitle || "").localeCompare(b.pageTitle || ""));
  }
  return arr.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

function getDisplayed() {
  return getSorted(getFiltered());
}

// ── Render ─────────────────────────────────────────────────────────────────

function buildTagOptions(currentTag) {
  return TAGS.map((t) =>
    `<option value="${t}"${currentTag === t ? " selected" : ""}>${t}</option>`
  ).join("");
}

function render(highlights) {
  list.innerHTML = "";

  if (allHighlights.length === 0) {
    list.innerHTML = '<p class="empty">No highlights yet.<br>Select text on any page and right-click to save.</p>';
    return;
  }

  if (highlights.length === 0) {
    const q = searchInput.value.trim();
    let reason;
    if (q && selectedTag !== "All") {
      reason = `<strong>${escapeHtml(q)}</strong> in <strong>${escapeHtml(selectedTag)}</strong>`;
    } else if (q) {
      reason = `<strong>${escapeHtml(q)}</strong>`;
    } else {
      reason = `<strong>${escapeHtml(selectedTag)}</strong>`;
    }
    list.innerHTML = `<p class="empty">No highlights match ${reason}.</p>`;
    return;
  }

  highlights.forEach((h) => {
    const tag = h.tag || "Other";
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-meta">
        <p class="page-title">${escapeHtml(h.pageTitle || h.url)}</p>
        <span class="tag-badge" data-tag="${tag}">${tag}</span>
        <button class="btn-star${h.favorite ? " starred" : ""}" data-id="${h.id}" title="${h.favorite ? "Unstar" : "Star"}">
          ${h.favorite ? "★" : "☆"}
        </button>
      </div>
      <p class="highlight-text">${escapeHtml(h.text)}</p>
      <p class="date">${escapeHtml(formatDate(h.createdAt))}</p>
      <div class="actions">
        <button class="btn btn-copy" data-id="${h.id}" data-text="${escapeAttr(h.text)}">Copy</button>
        <button class="btn btn-source" data-url="${escapeAttr(h.url)}">Open Source</button>
        <button class="btn btn-delete" data-id="${h.id}">Delete</button>
        <select class="tag-select" data-id="${h.id}" title="Edit tag">
          ${buildTagOptions(tag)}
        </select>
      </div>
    `;
    list.appendChild(card);
  });
}

function loadAndRender() {
  chrome.storage.local.get({ highlights: [] }, (result) => {
    allHighlights = result.highlights;
    renderStats();
    render(getDisplayed());
  });
}

// ── Sort ───────────────────────────────────────────────────────────────────

sortSelect.addEventListener("change", () => {
  sortOrder = sortSelect.value;
  render(getDisplayed());
});

// ── Tag filter pills ───────────────────────────────────────────────────────

tagFilter.addEventListener("click", (e) => {
  const pill = e.target.closest(".tag-pill");
  if (!pill) return;
  selectedTag = pill.dataset.tag;
  document.querySelectorAll(".tag-pill").forEach((p) =>
    p.classList.toggle("active", p.dataset.tag === selectedTag)
  );
  render(getDisplayed());
});

// ── Search ─────────────────────────────────────────────────────────────────

searchInput.addEventListener("input", () => {
  render(getDisplayed());
});

// ── Card actions (delegated) ───────────────────────────────────────────────

list.addEventListener("click", (e) => {
  const starBtn   = e.target.closest(".btn-star");
  const copyBtn   = e.target.closest(".btn-copy");
  const sourceBtn = e.target.closest(".btn-source");
  const deleteBtn = e.target.closest(".btn-delete");

  if (starBtn) {
    const id = starBtn.dataset.id;
    chrome.storage.local.get({ highlights: [] }, (result) => {
      const updated = result.highlights.map((h) =>
        h.id === id ? { ...h, favorite: !h.favorite } : h
      );
      chrome.storage.local.set({ highlights: updated }, () => {
        allHighlights = updated;
        renderStats();
        render(getDisplayed());
      });
    });
  }

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

// ── Edit tag (delegated) ───────────────────────────────────────────────────

list.addEventListener("change", (e) => {
  const sel = e.target.closest(".tag-select");
  if (!sel) return;
  const id = sel.dataset.id;
  const newTag = sel.value;
  chrome.storage.local.get({ highlights: [] }, (result) => {
    const updated = result.highlights.map((h) =>
      h.id === id ? { ...h, tag: newTag } : h
    );
    chrome.storage.local.set({ highlights: updated }, () => {
      allHighlights = updated;
      renderStats();
      render(getDisplayed());
    });
  });
});

// ── Toolbar: Clear All ─────────────────────────────────────────────────────

document.getElementById("btn-clear-all").addEventListener("click", () => {
  if (!confirm("Delete all highlights? This cannot be undone.")) return;
  chrome.storage.local.set({ highlights: [] }, loadAndRender);
});

// ── Toolbar: Export JSON ───────────────────────────────────────────────────

document.getElementById("btn-export-json").addEventListener("click", () => {
  const blob = new Blob(
    [JSON.stringify(allHighlights, null, 2)],
    { type: "application/json" }
  );
  triggerDownload(blob, "highlights.json");
});

// ── Toolbar: Export CSV ────────────────────────────────────────────────────

document.getElementById("btn-export-csv").addEventListener("click", () => {
  const headers = ["id", "text", "url", "pageTitle", "createdAt", "tag", "favorite"];
  const rows = allHighlights.map((h) =>
    headers.map((k) => {
      if (k === "tag")      return csvCell(h[k] || "Other");
      if (k === "favorite") return csvCell(h[k] ? "true" : "false");
      return csvCell(h[k]);
    }).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv" });
  triggerDownload(blob, "highlights.csv");
});

// ── Toolbar: Import JSON ───────────────────────────────────────────────────

document.getElementById("btn-import-json").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!Array.isArray(parsed)) throw new Error("not an array");
        const valid = parsed.filter((h) => h && typeof h.id === "string" && typeof h.text === "string");
        if (valid.length === 0) throw new Error("no valid highlights");
        chrome.storage.local.get({ highlights: [] }, (result) => {
          const existingIds = new Set(result.highlights.map((h) => h.id));
          const fresh = valid.filter((h) => !existingIds.has(h.id));
          const merged = [...result.highlights, ...fresh];
          chrome.storage.local.set({ highlights: merged }, () => {
            loadAndRender();
            alert(`Imported ${fresh.length} highlight(s). ${valid.length - fresh.length} duplicate(s) skipped.`);
          });
        });
      } catch {
        alert("Could not import. Make sure you selected a JSON file exported from Universal Highlight Helper.");
      }
    };
    reader.readAsText(file);
  });
  input.click();
});

// ── Init ───────────────────────────────────────────────────────────────────

loadAndRender();
