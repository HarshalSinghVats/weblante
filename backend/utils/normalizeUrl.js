export function normalizeUrl(inputUrl) {
  try {
    const url = new URL(
      inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`
    );

    let host = url.hostname.toLowerCase();

    if (host.startsWith("www.")) {
      host = host.slice(4);
    }

    // Search engines → keep only main query
    const isSearch =
      (host.includes("google.") && url.pathname === "/search") ||
      host === "search.brave.com" ||
      host.includes("bing.com");

    if (isSearch) {
      const q =
        url.searchParams.get("q") ||
        url.searchParams.get("query") ||
        url.searchParams.get("search") ||
        "";

      return `https://${host}${url.pathname}?q=${encodeURIComponent(q)}`;
    }

    // Non-search → strip tracking params
    return `https://${host}${url.pathname}`;
  } catch {
    return inputUrl;
  }
}

export function normalizeDomain(inputUrl) {
  try {
    const url = new URL(
      inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`
    );

    let host = url.hostname.toLowerCase();

    if (host.startsWith("www.")) {
      host = host.slice(4);
    }

    return host;
  } catch {
    return null;
  }
}
