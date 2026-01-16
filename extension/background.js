const allowedKeys = new Set();
const seenSearches = new Set();

function urlKey(url) {
  return url;
}
function extractSearchQuery(url) {
  try {
    const u = new URL(url);

    if (u.hostname.includes("google.") && u.pathname === "/search") {
      return u.searchParams.get("q");
    }

    if (u.hostname === "search.brave.com" && u.pathname === "/search") {
      return u.searchParams.get("q");
    }

    return null;
  } catch {
    return null;
  }
}

function looksObviouslyAdult(query) {
  if (!query) return false;
  const q = query.toLowerCase();
  return (
    q.includes("porn") ||
    q.includes("sex") ||
    q.includes("xxx") ||
    q.includes("nude") ||
    q.includes("sexvideo")
  );
}

async function analyzeSearchSilently(tabId, url, query) {
  // 🔁 Deduplicate per tab + query
  const dedupeKey = `${tabId}:${query}`;
  if (seenSearches.has(dedupeKey)) return;

  seenSearches.add(dedupeKey);
  setTimeout(() => seenSearches.delete(dedupeKey), 2000);

  if (looksObviouslyAdult(query)) {
    const decisionUrl =
      chrome.runtime.getURL("decision.html") +
      "?url=" + encodeURIComponent(url);

    chrome.tabs.update(tabId, { url: decisionUrl });
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        title: query,
        description: query,
        body: ""
      })
    });

    const decision = await res.json();


    if (decision.verdict === "block") {
      const decisionUrl =
        chrome.runtime.getURL("decision.html") +
        "?url=" + encodeURIComponent(url);

      chrome.tabs.update(tabId, { url: decisionUrl });
    }

  } catch (e) {
    console.error("Silent search analysis failed:", e);
  }
}

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;

  const url = details.url;
  if (!url.startsWith("http")) return;

  // 🔍 SEARCH → silent analysis
  const query = extractSearchQuery(url);
  if (query) {
    analyzeSearchSilently(details.tabId, url, query);
    return;
  }

  const key = urlKey(url);
  if (allowedKeys.has(key)) return;

  const decisionUrl =
    chrome.runtime.getURL("decision.html") +
    "?url=" + encodeURIComponent(url);

  chrome.tabs.update(details.tabId, { url: decisionUrl });
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) return;

  const url = details.url;
  if (!url.startsWith("http")) return;

  const query = extractSearchQuery(url);
  if (query) {
    analyzeSearchSilently(details.tabId, url, query);
  }
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "ALLOW_THIS_URL") {
    const key = urlKey(msg.url);
    allowedKeys.add(key);

    chrome.tabs.update(sender.tab.id, { url: msg.url });
  }
});
