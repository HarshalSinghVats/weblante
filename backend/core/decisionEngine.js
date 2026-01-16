import {
  getCachedDecision,
  setCachedDecision
} from "../cache/decisionCache.js";

import { checkAdultDomain } from "../heuristics/adultDomain.js";
import { checkAllowlist } from "../heuristics/allowlist.js";
import { scanTextSources } from "../analysis/scanTextSources.js";
import { checkSafeBrowsing } from "../reputation/safeBrowsing.js";
import { checkUrlPath } from "../heuristics/urlPath.js";

const SAFE_BROWSING_KEY = process.env.SAFE_BROWSING_KEY;
const KEYWORD_BLOCK_THRESHOLD = 0.6;

/* -----------------------
   Search detection
----------------------- */
function isSearchPage(url) {
  try {
    const u = new URL(url);
    return (
      (u.hostname.includes("google.") && u.pathname === "/search") ||
      (u.hostname === "search.brave.com" && u.pathname === "/search")
    );
  } catch {
    return false;
  }
}

export async function decideNavigation(input) {
  const { url } = input;
  const isSearch = isSearchPage(url);

  /* 0. CACHE (skip for search pages) */
  if (!isSearch) {
    const cached = getCachedDecision(url);
    if (cached) return cached;
  }

  /* 1. HARD BLOCK — Known adult domains */
  const adultDomainResult = checkAdultDomain(url);
  if (adultDomainResult.hit) {
    const decision = {
      verdict: "block",
      riskScore: 1.0,
      reasons: [adultDomainResult.reason]
    };
    if (!isSearch) setCachedDecision(url, decision);
    return decision;
  }

  /* 2. HARD BLOCK — Safe Browsing */
  const safeResult = await checkSafeBrowsing(url, SAFE_BROWSING_KEY);
  if (safeResult.hit) {
    const decision = {
      verdict: "block",
      riskScore: 1.0,
      reasons: [safeResult.reason]
    };
    if (!isSearch) setCachedDecision(url, decision);
    return decision;
  }

  /* 3. URL PATH HEURISTIC */
  const pathResult = checkUrlPath(url);
  if (pathResult.hit) {
    const decision = {
      verdict: "block",
      riskScore: 0.7,
      reasons: [pathResult.reason]
    };
    if (!isSearch) setCachedDecision(url, decision);
    return decision;
  }

  /* 4. KEYWORD ANALYSIS */
  const keywordResult = scanTextSources(input);

  // 🚨 HARD BLOCK — high-risk keywords (search or not)
  if (keywordResult.hardBlock === true) {
    return {
      verdict: "block",
      riskScore: 1.0,
      reasons: keywordResult.reasons
    };
  }

  // Threshold-based block
  if (keywordResult.score >= KEYWORD_BLOCK_THRESHOLD) {
    const decision = {
      verdict: "block",
      riskScore: keywordResult.score,
      reasons: keywordResult.reasons
    };
    if (!isSearch) setCachedDecision(url, decision);
    return decision;
  }

  /* 5. CONDITIONAL ALLOWLIST (NON-SEARCH ONLY) */
  if (!isSearch) {
    const allowResult = checkAllowlist(url);
    if (allowResult.hit) {
      const decision = {
        verdict: "allow",
        riskScore: 0,
        reasons: [allowResult.reason]
      };
      setCachedDecision(url, decision);
      return decision;
    }
  }

  /* 6. DEFAULT ALLOW */
  const decision = {
    verdict: "allow",
    riskScore: keywordResult.score,
    reasons: keywordResult.reasons
  };

  if (!isSearch) setCachedDecision(url, decision);
  return decision;
}
