import { ADULT_DOMAINS, ADULT_TLDS } from "../config/adultDomains.js";
import { normalizeDomain } from "../utils/normalizeUrl.js";

export function checkAdultDomain(inputUrl) {
  const domain = normalizeDomain(inputUrl);
  if (!domain) return { hit: false };

  // Exact match or subdomain match
  for (const blocked of ADULT_DOMAINS) {
    if (domain === blocked || domain.endsWith(`.${blocked}`)) {
      return {
        hit: true,
        reason: `Known adult domain (${blocked})`
      };
    }
  }

  // Adult TLD match
  for (const tld of ADULT_TLDS) {
    if (domain.endsWith(tld)) {
      return {
        hit: true,
        reason: `Adult top-level domain (${tld})`
      };
    }
  }

  return { hit: false };
}
