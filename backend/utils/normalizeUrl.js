export function normalizeDomain(inputUrl) {
  try {
    const url = new URL(
      inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`
    );

    let host = url.hostname.toLowerCase();

    // strip common prefixes
    if (host.startsWith("www.")) {
      host = host.slice(4);
    }

    return host;
  } catch {
    return null;
  }
}
