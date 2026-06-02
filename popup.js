const list = document.getElementById("highlights-list");

function render(highlights) {
  list.innerHTML = "";

  if (highlights.length === 0) {
    list.innerHTML = '<p class="empty">No highlights yet. Select text on any page and right-click to save.</p>';
    return;
  }

  highlights.forEach((h) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = h.id;

    card.innerHTML = `
      <p class="page-title">${escapeHtml(h.pageTitle || h.url)}</p>
      <p class="highlight-text">${escapeHtml(h.text)}</p>
      <div class="actions">
        <button class="btn-copy" data-id="${h.id}" data-text="${escapeAttr(h.text)}">Copy</button>
        <button class="btn-delete" data-id="${h.id}">Delete</button>
      </div>
    `;

    list.appendChild(card);
  });
}

function loadAndRender() {
  chrome.storage.local.get({ highlights: [] }, (result) => {
    render(result.highlights);
  });
}

list.addEventListener("click", (e) => {
  const copyBtn = e.target.closest(".btn-copy");
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

  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    chrome.storage.local.get({ highlights: [] }, (result) => {
      const updated = result.highlights.filter((h) => h.id !== id);
      chrome.storage.local.set({ highlights: updated }, loadAndRender);
    });
  }
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

loadAndRender();
