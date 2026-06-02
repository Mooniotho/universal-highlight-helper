// ai.js — AI module (mock implementation)
// Replace each function body with a real API call when ready.
// All functions are async and available globally for popup.js.

const _AI_DELAY_MS = 1300;

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function _excerpt(text, max) {
  const s = String(text).trim().replace(/\s+/g, " ");
  return s.length <= max ? s : s.slice(0, max).trimEnd() + "…";
}

function _keyTerm(text) {
  const words = String(text).trim().split(/\s+/);
  return words.find((w) => w.length > 5 && /^[A-Za-z]/.test(w)) || words[0] || "this concept";
}

async function summarizeHighlight(text) {
  await _sleep(_AI_DELAY_MS);
  const snip = _excerpt(text, 85);
  return (
    `The highlighted passage reads:\n"${snip}"\n\n` +
    `Summary: This text presents a focused idea from the source page. ` +
    `The main point centers on the subject introduced at the start of the passage, ` +
    `supported by contextual detail that reinforces the central concept.\n\n` +
    `── Mock response. Connect a real AI API to replace this.`
  );
}

async function explainHighlight(text) {
  await _sleep(_AI_DELAY_MS);
  const snip = _excerpt(text, 85);
  const term = _keyTerm(text);
  return (
    `Passage:\n"${snip}"\n\n` +
    `Explanation:\n` +
    `• "${term}" is a key term introduced in this passage.\n` +
    `• The text likely comes from a longer article or document — surrounding context matters.\n` +
    `• The language suggests a formal or informational register.\n` +
    `• To fully interpret this, consider the source page and the paragraphs around it.\n\n` +
    `── Mock response. Connect a real AI API to replace this.`
  );
}

async function generateFlashcards(text) {
  await _sleep(_AI_DELAY_MS);
  const snip  = _excerpt(text, 60);
  const short = _excerpt(text, 38);
  const term  = _keyTerm(text);
  return [
    {
      q: "What is the main idea of this passage?",
      a: `The passage covers: "${snip}"`,
    },
    {
      q: `What does "${term}" refer to in this context?`,
      a: `"${term}" is a key concept from the highlighted text. It relates to the broader subject of the source page.`,
    },
    {
      q: "How would you summarize this in one sentence?",
      a: `This passage introduces an idea related to "${short}" within the context of the source material.`,
    },
  ];
}
