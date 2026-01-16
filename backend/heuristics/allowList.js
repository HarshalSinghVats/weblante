import { TRUSTED_DOMAINS } from "../config/trustedDomains.js";
import { normalizeDomain } from "../utils/normalizeUrl.js";

export function checkAllowlist(inputUrl) {
  const domain = normalizeDomain(inputUrl);
  if (!domain) return { hit: false };

  for (const trusted of TRUSTED_DOMAINS) {
    if (domain === trusted || domain.endsWith(`.${trusted}`)) {
      return {
        hit: true,
        reason: `Trusted domain (${trusted})`
      };
    }
  }

  return { hit: false };
}
