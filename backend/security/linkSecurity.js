const REDIRECT_PARAMS = [
  "redirect",
  "redirect_uri",
  "redirect_url",
  "next",
  "continue",
  "url",
  "dest",
  "destination"
];

const SHORTENER_DOMAINS = [
  "bit.ly",
  "t.co",
  "tinyurl.com",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly"
];

export function checkLinkSecurity(url) {
  try {
    const u = new URL(url);

    // 1. Redirect parameter abuse
    for (const p of REDIRECT_PARAMS) {
      if (u.searchParams.has(p)) {
        return {
          hit: true,
          reason: "Suspicious redirect detected"
        };
      }
    }

    // 2. URL shorteners
    if (SHORTENER_DOMAINS.some(d => u.hostname.includes(d))) {
      return {
        hit: true,
        reason: "URL shortener blocked for safety"
      };
    }

    return { hit: false };
  } catch {
    return { hit: true, reason: "Malformed URL detected" };
  }
}
