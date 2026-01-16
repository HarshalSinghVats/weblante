import { normalizeDomain } from "../utils/normalizeUrl.js";

const SUSPICIOUS_PATH_TOKENS = [
  "porn",
  "xxx",
  "sex",
  "nude",
  "hentai",
  "nsfw"
];

export function checkUrlPath(inputUrl) {
  try {
    const url = new URL(
      inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`
    );

    const path = url.pathname.toLowerCase();

    for (const token of SUSPICIOUS_PATH_TOKENS) {
      if (path.includes(`/${token}`) || path.includes(`-${token}`)) {
        return {
          hit: true,
          reason: `Suspicious URL path (${token})`
        };
      }
    }

    return { hit: false };
  } catch {
    return { hit: false };
  }
}
