// ai-providers.js
// Communicates with OpenAI, Anthropic, and Ollama.
// Exposed globally as AI_PROVIDERS and AINotConfiguredError.

class AINotConfiguredError extends Error {
  constructor() {
    super("No AI provider configured. Open Settings to get started.");
    this.name = "AINotConfiguredError";
  }
}

const AI_PROVIDERS = (() => {

  const DEFAULTS = {
    aiProvider:     "",
    openaiKey:      "",
    openaiModel:    "gpt-4o-mini",
    anthropicKey:   "",
    anthropicModel: "claude-haiku-4-5-20251001",
    ollamaUrl:      "http://localhost:11434",
    ollamaModel:    "llama3.2"
  };

  function getSettings() {
    return new Promise((resolve) => chrome.storage.local.get(DEFAULTS, resolve));
  }

  // ── Provider implementations ──────────────────────────────────────────────

  async function _openai(s, prompt, system) {
    if (!s.openaiKey) {
      throw new Error("OpenAI API key is missing. Open Settings to add it.");
    }
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${s.openaiKey}`
      },
      body: JSON.stringify({
        model: s.openaiModel || "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user",   content: prompt }
        ],
        max_tokens: 600,
        temperature: 0.7
      })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `OpenAI error ${res.status}`);
    }
    const data = await res.json();
    return (data.choices?.[0]?.message?.content || "").trim();
  }

  async function _anthropic(s, prompt, system) {
    if (!s.anthropicKey) {
      throw new Error("Anthropic API key is missing. Open Settings to add it.");
    }
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": s.anthropicKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: s.anthropicModel || "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `Anthropic error ${res.status}`);
    }
    const data = await res.json();
    return (data.content?.[0]?.text || "").trim();
  }

  async function _ollama(s, prompt, system) {
    const base = (s.ollamaUrl || "http://localhost:11434").replace(/\/$/, "");
    const res = await fetch(`${base}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:  s.ollamaModel || "llama3.2",
        system,
        prompt,
        stream: false
      })
    });
    if (!res.ok) {
      throw new Error(`Ollama returned ${res.status}. Is Ollama running at ${base}?`);
    }
    const data = await res.json();
    return (data.response || "").trim();
  }

  // ── Dispatch ──────────────────────────────────────────────────────────────

  async function call(prompt, system) {
    const s = await getSettings();
    switch (s.aiProvider) {
      case "openai":    return _openai(s, prompt, system);
      case "anthropic": return _anthropic(s, prompt, system);
      case "ollama":    return _ollama(s, prompt, system);
      default:
        throw new Error(`Unknown provider: "${s.aiProvider}"`);
    }
  }

  return { getSettings, call };
})();
