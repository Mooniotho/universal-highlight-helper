const TAGS             = ["School", "Work", "Research", "Personal", "Other"];
const LONG_THRESHOLD   = 300;
const LONG_TRUNCATE_AT = 240;

let allHighlights  = [];
let selectedTag    = "All";
let sortOrder      = "newest";
let selectedSource = "";

const list           = document.getElementById("highlights-list");
const searchInput    = document.getElementById("search");
const tagFilter      = document.getElementById("tag-filter");
const statsBar       = document.getElementById("stats-bar");
const sortSelect     = document.getElementById("sort-select");
const sourcesBar     = document.getElementById("sources-bar");
const sourcesList    = document.getElementById("sources-list");
const clearSourceBtn = document.getElementById("btn-clear-source");

// ── Utilities ──────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
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
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return ""; }
}

// ── Toast ──────────────────────────────────────────────────────────────────

function showToast(message) {
  const container = document.getElementById("toast-container");
  const toast     = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("hiding");
    setTimeout(() => toast.remove(), 320);
  }, 1800);
}

// ── Stats ──────────────────────────────────────────────────────────────────

function renderStats() {
  if (allHighlights.length === 0) { statsBar.innerHTML = ""; return; }

  const counts = {};
  let starred  = 0;
  TAGS.forEach((t) => (counts[t] = 0));
  allHighlights.forEach((h) => {
    const t = h.tag || "Other";
    counts[t] = (counts[t] || 0) + 1;
    if (h.favorite) starred++;
  });

  let html = `<span class="stat-chip stat-total">${allHighlights.length} total</span>`;
  TAGS.forEach((t) => { if (counts[t] > 0) html += `<span class="stat-chip" data-tag="${t}">${counts[t]} ${t}</span>`; });
  if (starred > 0) html += `<span class="stat-chip stat-starred">${starred} starred</span>`;
  statsBar.innerHTML = html;
}

// ── Sources ────────────────────────────────────────────────────────────────

function renderSources() {
  const counts = {};
  allHighlights.forEach((h) => {
    const d = getDomain(h.url || "");
    if (d) counts[d] = (counts[d] || 0) + 1;
  });

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  if (top.length < 2) { sourcesBar.style.display = "none"; return; }

  sourcesBar.style.display = "block";
  clearSourceBtn.style.display = selectedSource ? "inline-block" : "none";

  sourcesList.innerHTML = top
    .map(([domain, count]) =>
      `<button class="source-pill${selectedSource === domain ? " active" : ""}" data-source="${escapeAttr(domain)}">
        ${escapeHtml(domain)} <span class="source-count">(${count})</span>
      </button>`
    )
    .join("");
}

// ── Filter & Sort ──────────────────────────────────────────────────────────

function getFiltered() {
  const q = searchInput.value.trim().toLowerCase();
  return allHighlights.filter((h) => {
    const tag = h.tag || "Other";

    let matchesTag;
    if (selectedTag === "All")          matchesTag = true;
    else if (selectedTag === "Starred") matchesTag = !!h.favorite;
    else                                matchesTag = tag === selectedTag;

    const matchesSearch = !q
      || h.text.toLowerCase().includes(q)
      || (h.pageTitle || "").toLowerCase().includes(q);

    const matchesSource = !selectedSource || getDomain(h.url || "") === selectedSource;

    return matchesTag && matchesSearch && matchesSource;
  });
}

function getSorted(arr) {
  const copy = [...arr];
  if (sortOrder === "oldest") return copy.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  if (sortOrder === "az")     return copy.sort((a, b) => (a.pageTitle || "").localeCompare(b.pageTitle || ""));
  return copy.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

function getDisplayed() { return getSorted(getFiltered()); }

// ── Render ─────────────────────────────────────────────────────────────────

function buildTagOptions(current) {
  return TAGS.map((t) => `<option value="${t}"${current === t ? " selected" : ""}>${t}</option>`).join("");
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
    } else if (selectedSource) {
      reason = `source <strong>${escapeHtml(selectedSource)}</strong>`;
    } else {
      reason = `<strong>${escapeHtml(selectedTag)}</strong>`;
    }
    list.innerHTML = `<p class="empty">No highlights match ${reason}.</p>`;
    return;
  }

  highlights.forEach((h) => {
    const tag    = h.tag || "Other";
    const isLong = h.text.length > LONG_THRESHOLD;
    const displayText = isLong ? h.text.slice(0, LONG_TRUNCATE_AT) + "…" : h.text;
    const card   = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-meta">
        <p class="page-title">${escapeHtml(h.pageTitle || h.url)}</p>
        <span class="tag-badge" data-tag="${tag}">${tag}</span>
        <button class="btn-star${h.favorite ? " starred" : ""}" data-id="${h.id}" title="${h.favorite ? "Unstar" : "Star"}">${h.favorite ? "★" : "☆"}</button>
      </div>
      <p class="highlight-text">${escapeHtml(displayText)}</p>
      ${isLong ? `<button class="btn-see-more" data-id="${h.id}">See More</button>` : ""}
      <p class="date">${escapeHtml(formatDate(h.createdAt))}</p>
      <div class="actions">
        <button class="btn btn-copy" data-id="${h.id}" data-text="${escapeAttr(h.text)}">Copy</button>
        <button class="btn btn-source" data-url="${escapeAttr(h.url)}">Open Source</button>
        <button class="btn btn-delete" data-id="${h.id}">Delete</button>
        <select class="tag-select" data-id="${h.id}" title="Edit tag">${buildTagOptions(tag)}</select>
      </div>
      <div class="ai-actions">
        <button class="btn btn-ai" data-action="summarize" data-id="${h.id}">Summarize</button>
        <button class="btn btn-ai" data-action="ask" data-id="${h.id}">Ask AI</button>
        <button class="btn btn-ai" data-action="flashcards" data-id="${h.id}">Flashcards</button>
      </div>
      <div class="ai-output" id="ai-${h.id}" style="display:none;"></div>
    `;
    list.appendChild(card);
  });
}

function loadAndRender() {
  chrome.storage.local.get({ highlights: [] }, (result) => {
    allHighlights = result.highlights;
    renderStats();
    renderSources();
    render(getDisplayed());
  });
}

// ── Flashcard carousel ─────────────────────────────────────────────────────

function renderFcSlide(carousel) {
  const cards = carousel._fcCards;
  const idx   = carousel._fcIndex;
  const card  = cards[idx];

  carousel.querySelector(".fc-slide").innerHTML = `
    <p class="fc-q"><strong>Q:</strong> ${escapeHtml(card.q)}</p>
    <p class="fc-hint">Tap card to reveal answer</p>
    <div class="fc-answer-wrap" hidden>
      <p class="fc-a"><strong>A:</strong> ${escapeHtml(card.a)}</p>
    </div>
  `;
  carousel.querySelector(".fc-counter").textContent = `${idx + 1} / ${cards.length}`;
  carousel.querySelector(".fc-btn-prev").disabled = idx === 0;
  carousel.querySelector(".fc-btn-next").disabled = idx === cards.length - 1;
}

// ── AI ─────────────────────────────────────────────────────────────────────

function getLabelForAction(action) {
  if (action === "summarize")  return "Summary";
  if (action === "ask")        return "Ask AI";
  if (action === "flashcards") return "Flashcards";
  return "AI Output";
}

function showAiError(contentEl, err) {
  if (err.name === "AINotConfiguredError") {
    contentEl.innerHTML =
      `No AI provider configured. <button class="btn-open-settings">Open Settings</button>`;
  } else {
    const msg        = escapeHtml(err.message || "Something went wrong. Please try again.");
    const needsSetup = err.message && err.message.includes("Open Settings");
    contentEl.innerHTML =
      `<span class="ai-error">${msg}</span>` +
      (needsSetup ? `<button class="btn-open-settings">Open Settings</button>` : "");
  }
}

async function generateAskResponse(outputEl, question) {
  const id        = outputEl.id.replace("ai-", "");
  const highlight = allHighlights.find((h) => h.id === id);
  if (!highlight || !question) return;

  const card      = outputEl.closest(".card");
  const allAiBtns = card.querySelectorAll(".btn-ai");
  const contentEl = outputEl.querySelector(".ai-content");
  const copyAiBtn = outputEl.querySelector(".btn-copy-ai");
  const input     = outputEl.querySelector(".ask-input");
  const submitBtn = outputEl.querySelector(".btn-ask-submit");

  contentEl.innerHTML = '<span class="ai-loading">Generating…</span>';
  if (copyAiBtn) copyAiBtn.style.display = "none";
  allAiBtns.forEach((b) => (b.disabled = true));
  if (input)     input.disabled     = true;
  if (submitBtn) submitBtn.disabled = true;

  try {
    const result = await askHighlightQuestion(highlight.text, question);
    contentEl.textContent      = result;
    copyAiBtn.dataset.text     = result;
    copyAiBtn.style.display    = "inline-block";
    showToast("✓ Answer generated");
  } catch (err) {
    showAiError(contentEl, err);
  } finally {
    allAiBtns.forEach((b) => (b.disabled = false));
    if (input)     input.disabled     = false;
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function handleAiAction(btn) {
  const action    = btn.dataset.action;
  const id        = btn.dataset.id;
  const highlight = allHighlights.find((h) => h.id === id);
  if (!highlight) return;

  const card      = btn.closest(".card");
  const outputEl  = card.querySelector(".ai-output");
  const allAiBtns = card.querySelectorAll(".btn-ai");

  // Ask AI shows an input field first — generation happens on submit
  if (action === "ask") {
    outputEl.style.display = "block";
    outputEl.innerHTML = `
      <div class="ai-output-header">
        <button class="btn-toggle-ai" title="Collapse">▼</button>
        <span class="ai-label">Ask AI</span>
        <div class="ai-header-right">
          <button class="btn-copy-ai" style="display:none;">Copy</button>
          <button class="btn-close-ai" title="Dismiss">×</button>
        </div>
      </div>
      <div class="ai-ask-wrap">
        <input type="text" class="ask-input" placeholder="Ask about this highlight…" autocomplete="off" spellcheck="false" />
        <button class="btn-ask-submit">Ask</button>
      </div>
      <div class="ai-content"></div>
    `;
    setTimeout(() => outputEl.querySelector(".ask-input")?.focus(), 50);
    return;
  }

  // Summarize + Flashcards: show loading immediately and generate
  outputEl.style.display = "block";
  outputEl.innerHTML = `
    <div class="ai-output-header">
      <button class="btn-toggle-ai" title="Collapse">▼</button>
      <span class="ai-label">${getLabelForAction(action)}</span>
      <div class="ai-header-right">
        <button class="btn-copy-ai" style="display:none;">Copy</button>
        <button class="btn-close-ai" title="Dismiss">×</button>
      </div>
    </div>
    <div class="ai-content"><span class="ai-loading">Generating…</span></div>
  `;

  allAiBtns.forEach((b) => (b.disabled = true));

  const contentEl = outputEl.querySelector(".ai-content");
  const copyAiBtn = outputEl.querySelector(".btn-copy-ai");

  try {
    if (action === "summarize") {
      const result = await summarizeHighlight(highlight.text);
      contentEl.textContent      = result;
      copyAiBtn.dataset.text     = result;
      copyAiBtn.style.display    = "inline-block";
      showToast("✓ Summary generated");

    } else if (action === "flashcards") {
      const cards = await generateFlashcards(highlight.text);

      const carouselEl        = document.createElement("div");
      carouselEl.className    = "fc-carousel";
      carouselEl._fcCards     = cards;
      carouselEl._fcIndex     = 0;
      carouselEl.innerHTML    = `
        <div class="fc-slide"></div>
        <div class="fc-nav">
          <button class="fc-btn-prev">&#8592;</button>
          <span class="fc-counter"></span>
          <button class="fc-btn-next">&#8594;</button>
        </div>
      `;
      contentEl.innerHTML = "";
      contentEl.appendChild(carouselEl);
      renderFcSlide(carouselEl);

      copyAiBtn.dataset.text  = cards.map((c, i) => `Q${i + 1}: ${c.q}\nA: ${c.a}`).join("\n\n");
      copyAiBtn.style.display = "inline-block";
      showToast("✓ Flashcards generated");
    }
  } catch (err) {
    showAiError(contentEl, err);
  } finally {
    allAiBtns.forEach((b) => (b.disabled = false));
  }
}

// ── Sort ───────────────────────────────────────────────────────────────────

sortSelect.addEventListener("change", () => {
  sortOrder = sortSelect.value;
  render(getDisplayed());
});

// ── Tag filter ─────────────────────────────────────────────────────────────

tagFilter.addEventListener("click", (e) => {
  const pill = e.target.closest(".tag-pill");
  if (!pill) return;
  selectedTag = pill.dataset.tag;
  document.querySelectorAll(".tag-pill").forEach((p) =>
    p.classList.toggle("active", p.dataset.tag === selectedTag)
  );
  render(getDisplayed());
});

// ── Source filter ──────────────────────────────────────────────────────────

sourcesList.addEventListener("click", (e) => {
  const pill = e.target.closest(".source-pill");
  if (!pill) return;
  const domain = pill.dataset.source;
  selectedSource = selectedSource === domain ? "" : domain;
  renderSources();
  render(getDisplayed());
});

clearSourceBtn.addEventListener("click", () => {
  selectedSource = "";
  renderSources();
  render(getDisplayed());
});

// ── Search ─────────────────────────────────────────────────────────────────

searchInput.addEventListener("input", () => { render(getDisplayed()); });

// ── Card actions (delegated) ───────────────────────────────────────────────

list.addEventListener("click", async (e) => {
  const starBtn       = e.target.closest(".btn-star");
  const copyBtn       = e.target.closest(".btn-copy");
  const sourceBtn     = e.target.closest(".btn-source");
  const deleteBtn     = e.target.closest(".btn-delete");
  const aiBtn         = e.target.closest(".btn-ai");
  const copyAiBtn     = e.target.closest(".btn-copy-ai");
  const closeAiBtn    = e.target.closest(".btn-close-ai");
  const toggleAiBtn   = e.target.closest(".btn-toggle-ai");
  const openSettingsBtn = e.target.closest(".btn-open-settings");
  const seeMoreBtn    = e.target.closest(".btn-see-more");
  const fcPrevBtn     = e.target.closest(".fc-btn-prev");
  const fcNextBtn     = e.target.closest(".fc-btn-next");
  const fcSlide       = e.target.closest(".fc-slide");

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
      copyBtn.disabled    = true;
      showToast("✓ Copied to clipboard");
      setTimeout(() => { copyBtn.textContent = "Copy"; copyBtn.disabled = false; }, 1500);
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
      chrome.storage.local.set({ highlights: updated }, () => {
        loadAndRender();
        showToast("✓ Highlight deleted");
      });
    });
  }

  if (aiBtn) { await handleAiAction(aiBtn); }

  const askSubmitBtn = e.target.closest(".btn-ask-submit");
  if (askSubmitBtn) {
    const outputEl = askSubmitBtn.closest(".ai-output");
    const question = outputEl.querySelector(".ask-input")?.value.trim();
    if (question) await generateAskResponse(outputEl, question);
  }

  if (copyAiBtn) {
    const text = copyAiBtn.dataset.text || "";
    navigator.clipboard.writeText(text).then(() => {
      copyAiBtn.textContent = "Copied!";
      copyAiBtn.disabled    = true;
      showToast("✓ AI response copied");
      setTimeout(() => { copyAiBtn.textContent = "Copy"; copyAiBtn.disabled = false; }, 1500);
    });
  }

  if (closeAiBtn) {
    const outputEl = closeAiBtn.closest(".ai-output");
    outputEl.innerHTML = "";
    outputEl.style.display = "none";
  }

  if (toggleAiBtn) {
    const outputEl  = toggleAiBtn.closest(".ai-output");
    const contentEl = outputEl.querySelector(".ai-content");
    if (!contentEl) return;
    const willCollapse = !contentEl.hidden;
    contentEl.hidden    = willCollapse;
    toggleAiBtn.textContent = willCollapse ? "▶" : "▼";
    toggleAiBtn.title       = willCollapse ? "Expand" : "Collapse";
  }

  if (openSettingsBtn) {
    window.open(chrome.runtime.getURL("settings.html"), "_blank");
  }

  if (seeMoreBtn) {
    const id        = seeMoreBtn.dataset.id;
    const card      = seeMoreBtn.closest(".card");
    const textEl    = card.querySelector(".highlight-text");
    const highlight = allHighlights.find((h) => h.id === id);
    if (!highlight) return;
    const collapsed = seeMoreBtn.textContent === "See More";
    textEl.textContent      = collapsed ? highlight.text : highlight.text.slice(0, LONG_TRUNCATE_AT) + "…";
    seeMoreBtn.textContent  = collapsed ? "See Less" : "See More";
  }

  if (fcPrevBtn) {
    const carousel = fcPrevBtn.closest(".fc-carousel");
    if (carousel._fcIndex > 0) { carousel._fcIndex--; renderFcSlide(carousel); }
  }

  if (fcNextBtn) {
    const carousel = fcNextBtn.closest(".fc-carousel");
    if (carousel._fcIndex < carousel._fcCards.length - 1) { carousel._fcIndex++; renderFcSlide(carousel); }
  }

  if (fcSlide) {
    const answerWrap = fcSlide.querySelector(".fc-answer-wrap");
    const hint       = fcSlide.querySelector(".fc-hint");
    if (!answerWrap) return;
    const willReveal  = answerWrap.hidden;
    answerWrap.hidden = !willReveal;
    if (hint) hint.hidden = willReveal;
  }
});

// ── Ask AI — Enter key ────────────────────────────────────────────────────

list.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;
  const input = e.target.closest(".ask-input");
  if (!input) return;
  const question = input.value.trim();
  if (!question) return;
  const outputEl = input.closest(".ai-output");
  await generateAskResponse(outputEl, question);
});

// ── Edit tag (delegated) ───────────────────────────────────────────────────

list.addEventListener("change", (e) => {
  const sel = e.target.closest(".tag-select");
  if (!sel) return;
  const id     = sel.dataset.id;
  const newTag = sel.value;
  chrome.storage.local.get({ highlights: [] }, (result) => {
    const updated = result.highlights.map((h) =>
      h.id === id ? { ...h, tag: newTag } : h
    );
    chrome.storage.local.set({ highlights: updated }, () => {
      allHighlights = updated;
      renderStats();
      render(getDisplayed());
      showToast("✓ Tag updated");
    });
  });
});

// ── Toolbar: Clear All ─────────────────────────────────────────────────────

document.getElementById("btn-clear-all").addEventListener("click", () => {
  if (!confirm("Delete all highlights? This cannot be undone.")) return;
  chrome.storage.local.set({ highlights: [] }, () => {
    loadAndRender();
    showToast("✓ All highlights cleared");
  });
});

// ── Toolbar: Export JSON ───────────────────────────────────────────────────

document.getElementById("btn-export-json").addEventListener("click", () => {
  triggerDownload(
    new Blob([JSON.stringify(allHighlights, null, 2)], { type: "application/json" }),
    "highlights.json"
  );
  showToast("✓ Exported as JSON");
});

// ── Toolbar: Export CSV ────────────────────────────────────────────────────

document.getElementById("btn-export-csv").addEventListener("click", () => {
  const headers = ["id", "text", "url", "pageTitle", "createdAt", "tag", "favorite"];
  const rows    = allHighlights.map((h) =>
    headers.map((k) => {
      if (k === "tag")      return csvCell(h[k] || "Other");
      if (k === "favorite") return csvCell(h[k] ? "true" : "false");
      return csvCell(h[k]);
    }).join(",")
  );
  triggerDownload(
    new Blob([[headers.join(","), ...rows].join("\r\n")], { type: "text/csv" }),
    "highlights.csv"
  );
  showToast("✓ Exported as CSV");
});

// ── Toolbar: Import JSON ───────────────────────────────────────────────────

document.getElementById("btn-import-json").addEventListener("click", () => {
  const input  = document.createElement("input");
  input.type   = "file";
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
          const fresh       = valid.filter((h) => !existingIds.has(h.id));
          chrome.storage.local.set({ highlights: [...result.highlights, ...fresh] }, () => {
            loadAndRender();
            showToast(`✓ Imported ${fresh.length} highlight(s)`);
          });
        });
      } catch {
        alert("Could not import. Select a JSON file exported from Universal Highlight Helper.");
      }
    };
    reader.readAsText(file);
  });
  input.click();
});

// ── Settings button ────────────────────────────────────────────────────────

document.getElementById("btn-settings").addEventListener("click", () => {
  window.open(chrome.runtime.getURL("settings.html"), "_blank");
});

// ── Init ───────────────────────────────────────────────────────────────────

loadAndRender();
