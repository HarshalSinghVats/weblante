// normalizeUrl.js

export function normalizeUrl(inputUrl) {
  try {
    const url = new URL(
      inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`
    );

    let host = url.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);

    const pathname = url.pathname.toLowerCase();

    const isSearch =
      host.includes("google.") ||
      host === "search.brave.com" ||
      host.includes("bing.com");

    // 🔒 SEARCH: preserve raw query (DO NOT decode / rewrite)
    if (isSearch) {
      return `${host}${pathname}${url.search}`;
    }

    // 🔒 NON-SEARCH: strip query params safely
    return `${host}${pathname}`;
  } catch {
    // never return null
    return String(inputUrl || "").toLowerCase();
  }
}

export function normalizeDomain(inputUrl) {
  try {
    const url = new URL(
      inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`
    );

    let host = url.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    return host;
  } catch {
    return String(inputUrl || "").toLowerCase();
  }
}
