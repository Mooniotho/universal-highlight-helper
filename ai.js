// ai.js
// Routes AI actions to the selected provider (or mock).
// Requires ai-providers.js to be loaded first.

const _AI_DELAY_MS = 1200;

function _sleep(ms)       { return new Promise((r) => setTimeout(r, ms)); }
function _excerpt(t, max) { const s = String(t).trim().replace(/\s+/g, " "); return s.length <= max ? s : s.slice(0, max).trimEnd() + "…"; }
function _keyTerm(t)      { const w = String(t).trim().split(/\s+/); return w.find((x) => x.length > 5 && /^[A-Za-z]/.test(x)) || w[0] || "this concept"; }

// ── Mock implementations ───────────────────────────────────────────────────

async function _mockSummarize(text) {
  await _sleep(_AI_DELAY_MS);
  return (
    `The highlighted passage reads:\n"${_excerpt(text, 85)}"\n\n` +
    `Summary: This text presents a focused idea from the source page. The main point centers on ` +
    `the subject introduced at the start of the passage, supported by contextual detail.\n\n` +
    `── Mock response. Open Settings to connect a real AI provider.`
  );
}

async function _mockAsk(text, question) {
  await _sleep(_AI_DELAY_MS);
  const snip = _excerpt(text, 80);
  return (
    `Question: "${question}"\n\n` +
    `Based on the highlighted text:\n"${snip}"\n\n` +
    `Answer: This is a demonstration response. With a real AI provider, you would receive a direct answer to your question using only the highlighted text as context.\n\n` +
    `── Mock response. Open Settings to connect a real AI provider.`
  );
}

async function _mockFlashcards(text) {
  await _sleep(_AI_DELAY_MS);
  const term = _keyTerm(text);
  return [
    { q: "What is the main idea of this passage?",         a: `The passage covers: "${_excerpt(text, 60)}"` },
    { q: `What does "${term}" refer to in this context?`,  a: `"${term}" is a key concept from the highlighted text, related to the broader subject of the source page.` },
    { q: "How would you summarize this in one sentence?",  a: `This passage introduces an idea related to "${_excerpt(text, 38)}" within the source material.` }
  ];
}

// ── JSON parser for flashcards ─────────────────────────────────────────────

function _parseFlashcards(raw) {
  try {
    const p = JSON.parse(raw.trim());
    if (Array.isArray(p) && p.length > 0) return p;
  } catch {}

  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try {
      const p = JSON.parse(match[1].trim());
      if (Array.isArray(p) && p.length > 0) return p;
    } catch {}
  }

  return [{ q: "AI Response", a: raw }];
}

// ── Public API ─────────────────────────────────────────────────────────────

async function summarizeHighlight(text) {
  const s = await AI_PROVIDERS.getSettings();
  if (!s.aiProvider) throw new AINotConfiguredError();
  if (s.aiProvider === "mock") return _mockSummarize(text);

  return AI_PROVIDERS.call(
    `Summarize the following highlighted text in 2-3 concise sentences:\n\n"${text}"`,
    "You are a helpful research assistant. Be concise and direct — no preamble or filler phrases."
  );
}

async function askHighlightQuestion(text, question) {
  const s = await AI_PROVIDERS.getSettings();
  if (!s.aiProvider) throw new AINotConfiguredError();
  if (s.aiProvider === "mock") return _mockAsk(text, question);

  return AI_PROVIDERS.call(
    `Highlight text:\n"${text}"\n\nQuestion: ${question}`,
    "You are a helpful assistant. Answer the user's question based ONLY on the provided highlight text. Be direct and concise."
  );
}

async function generateFlashcards(text) {
  const s = await AI_PROVIDERS.getSettings();
  if (!s.aiProvider) throw new AINotConfiguredError();
  if (s.aiProvider === "mock") return _mockFlashcards(text);

  const raw = await AI_PROVIDERS.call(
    `Create exactly 3 flashcards from the following text.\nReturn ONLY a JSON array — no explanation, no markdown fences:\n[{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."}]\n\nText: "${text}"`,
    "You are a study assistant. Return only a valid JSON array, nothing else."
  );

  return _parseFlashcards(raw);
}
