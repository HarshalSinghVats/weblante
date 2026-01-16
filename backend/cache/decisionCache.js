const store = new Map();

// TTLs in ms
const TTL = {
  allow: 60 * 60 * 1000,    // 1 hour
  block: 6 * 60 * 60 * 1000 // 6 hours
};

function now() {
  return Date.now();
}

/**
 * Cache key = normalized host + pathname
 * This prevents github.com/porn poisoning github.com/
 */
function getCacheKey(inputUrl) {
  try {
    const url = new URL(
      inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`
    );

    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname || "/";

    return `${host}${path}`;
  } catch {
    return null;
  }
}

export function getCachedDecision(inputUrl) {
  const key = getCacheKey(inputUrl);
  if (!key) return null;

  const entry = store.get(key);
  if (!entry) return null;

  if (entry.expiresAt < now()) {
    store.delete(key);
    return null;
  }

  return entry.decision;
}

export function setCachedDecision(inputUrl, decision) {
  const key = getCacheKey(inputUrl);
  if (!key) return;

  const ttl = TTL[decision.verdict];
  if (!ttl) return;

  store.set(key, {
    decision,
    expiresAt: now() + ttl
  });
}
