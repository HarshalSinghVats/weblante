import {
  getCachedDecision,
  setCachedDecision
} from "../cache/decisionCache.js";

import { checkAdultDomain } from "../heuristics/adultDomain.js";
import { checkAllowlist } from "../heuristics/allowlist.js";
import { scanTextSources } from "../analysis/scanTextSources.js";
import { checkSafeBrowsing } from "../reputation/safeBrowsing.js";
import { checkUrlPath } from "../heuristics/urlPath.js";

import db from "../firebase.js";

const SAFE_BROWSING_KEY = process.env.SAFE_BROWSING_KEY;
const KEYWORD_BLOCK_THRESHOLD = 0.6;

const lastSeen = new Map();

/* -----------------------
   Universal search detection
----------------------- */
function isSearchPage(url) {
  try {
    const u = new URL(url);

    const SEARCH_PARAMS = [
      "q",
      "query",
      "search",
      "search_query",
      "text",
      "k",
      "keyword"
    ];

    for (const p of SEARCH_PARAMS) {
      if (u.searchParams.get(p)) return true;
    }

    if (
      u.hostname.includes("wikipedia.org") &&
      u.pathname.startsWith("/wiki/")
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

async function logActivity({ url, verdict, riskScore, reasons }) {
  const now = Date.now();

  const prev = lastSeen.get("active");
  const durationMs = prev ? now - prev.time : 0;

  lastSeen.set("active", { time: now, url });

  await db.collection("activity").add({
    url,
    decision: verdict,
    reason: reasons.join(", "),
    riskScore,
    durationMs,
    timestamp: now
  });
}

export async function decideNavigation(input) {
  const { url } = input;
  const isSearch = isSearchPage(url);

  if (!isSearch) {
    const cached = getCachedDecision(url);
    if (cached) return cached;
  }

  const adultDomainResult = checkAdultDomain(url);
  if (adultDomainResult.hit) {
    const decision = {
      verdict: "block",
      riskScore: 1.0,
      reasons: [adultDomainResult.reason]
    };
    await logActivity({ url, ...decision });
    if (!isSearch) setCachedDecision(url, decision);
    return decision;
  }

  const safeResult = await checkSafeBrowsing(url, SAFE_BROWSING_KEY);
  if (safeResult.hit) {
    const decision = {
      verdict: "block",
      riskScore: 1.0,
      reasons: [safeResult.reason]
    };
    await logActivity({ url, ...decision });
    if (!isSearch) setCachedDecision(url, decision);
    return decision;
  }

  const pathResult = checkUrlPath(url);
  if (pathResult.hit) {
    const decision = {
      verdict: "block",
      riskScore: 0.7,
      reasons: [pathResult.reason]
    };
    await logActivity({ url, ...decision });
    if (!isSearch) setCachedDecision(url, decision);
    return decision;
  }

  const keywordResult = scanTextSources(input);

  if (keywordResult.hardBlock === true) {
    const decision = {
      verdict: "block",
      riskScore: 1.0,
      reasons: keywordResult.reasons
    };
    await logActivity({ url, ...decision });
    return decision;
  }

  if (keywordResult.score >= KEYWORD_BLOCK_THRESHOLD) {
    const decision = {
      verdict: "block",
      riskScore: keywordResult.score,
      reasons: keywordResult.reasons
    };
    await logActivity({ url, ...decision });
    if (!isSearch) setCachedDecision(url, decision);
    return decision;
  }

  if (!isSearch) {
    const allowResult = checkAllowlist(url);
    if (allowResult.hit) {
      const decision = {
        verdict: "allow",
        riskScore: 0,
        reasons: [allowResult.reason]
      };
      await logActivity({ url, ...decision });
      setCachedDecision(url, decision);
      return decision;
    }
  }

  const decision = {
    verdict: "allow",
    riskScore: keywordResult.score,
    reasons: keywordResult.reasons
  };

  await logActivity({ url, ...decision });
  if (!isSearch) setCachedDecision(url, decision);
  return decision;
}
