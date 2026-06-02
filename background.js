chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-highlight",
    title: "Save Highlight",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "save-highlight") return;

  const highlight = {
    id: Date.now().toString(),
    text: info.selectionText,
    url: tab.url,
    pageTitle: tab.title,
    createdAt: new Date().toISOString()
  };

  console.log("[UHH] Highlight captured:", highlight);

  chrome.storage.local.get({ highlights: [] }, (result) => {
    const updated = [highlight, ...result.highlights];
    chrome.storage.local.set({ highlights: updated }, () => {
      console.log("[UHH] Saved. Total highlights:", updated.length);
    });
  });
});
