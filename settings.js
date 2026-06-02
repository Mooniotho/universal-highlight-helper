// settings.js

const providerRadios = document.querySelectorAll('input[name="provider"]');
const configSections = document.querySelectorAll(".provider-config");

const openaiKeyInput    = document.getElementById("openai-key");
const openaiModelSel    = document.getElementById("openai-model");
const anthropicKeyInput = document.getElementById("anthropic-key");
const anthropicModelSel = document.getElementById("anthropic-model");
const ollamaUrlInput    = document.getElementById("ollama-url");
const ollamaModelInput  = document.getElementById("ollama-model");

const btnSave  = document.getElementById("btn-save");
const btnTest  = document.getElementById("btn-test");
const statusEl = document.getElementById("status-msg");

// ── Load saved settings ────────────────────────────────────────────────────

AI_PROVIDERS.getSettings().then((s) => {
  const provider = s.aiProvider || "mock";
  const radio = document.querySelector(`input[name="provider"][value="${provider}"]`);
  if (radio) radio.checked = true;

  openaiKeyInput.value    = s.openaiKey      || "";
  openaiModelSel.value    = s.openaiModel    || "gpt-4o-mini";
  anthropicKeyInput.value = s.anthropicKey   || "";
  anthropicModelSel.value = s.anthropicModel || "claude-haiku-4-5-20251001";
  ollamaUrlInput.value    = s.ollamaUrl      || "http://localhost:11434";
  ollamaModelInput.value  = s.ollamaModel    || "llama3.2";

  updateVisibility();
});

// ── Show/hide provider config panels ──────────────────────────────────────

function selectedProvider() {
  return document.querySelector('input[name="provider"]:checked')?.value || "";
}

function updateVisibility() {
  const p = selectedProvider();
  configSections.forEach((el) =>
    el.classList.toggle("visible", el.id === `config-${p}`)
  );
  btnTest.disabled = (p === "mock" || !p);
}

providerRadios.forEach((r) => r.addEventListener("change", updateVisibility));

// ── Password show/hide toggles ─────────────────────────────────────────────

document.querySelectorAll(".btn-toggle-pw").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    btn.textContent = isHidden ? "Hide" : "Show";
  });
});

// ── Build settings object from form ───────────────────────────────────────

function readForm() {
  return {
    aiProvider:     selectedProvider(),
    openaiKey:      openaiKeyInput.value.trim(),
    openaiModel:    openaiModelSel.value,
    anthropicKey:   anthropicKeyInput.value.trim(),
    anthropicModel: anthropicModelSel.value,
    ollamaUrl:      ollamaUrlInput.value.trim() || "http://localhost:11434",
    ollamaModel:    ollamaModelInput.value.trim() || "llama3.2"
  };
}

// ── Save ───────────────────────────────────────────────────────────────────

btnSave.addEventListener("click", () => {
  btnSave.disabled = true;
  chrome.storage.local.set(readForm(), () => {
    btnSave.disabled = false;
    showStatus("Settings saved.", "success");
  });
});

// ── Test connection ────────────────────────────────────────────────────────

btnTest.addEventListener("click", async () => {
  btnSave.disabled = true;
  btnTest.disabled = true;
  showStatus("Testing connection…", "loading");

  await new Promise((res) => chrome.storage.local.set(readForm(), res));

  try {
    const reply = await AI_PROVIDERS.call(
      "Reply with exactly one word: pong",
      "You are a test assistant. Reply with only the word: pong"
    );
    showStatus(`Connected. Response: "${reply.slice(0, 60)}"`, "success");
  } catch (err) {
    showStatus(err.message || "Connection failed.", "error");
  } finally {
    btnSave.disabled = false;
    btnTest.disabled = selectedProvider() === "mock";
  }
});

// ── Status helper ──────────────────────────────────────────────────────────

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = `status-msg ${type}`;
  if (type === "success") {
    setTimeout(() => { statusEl.className = "status-msg"; }, 4000);
  }
}
