import {
  getCachedDecision,
  setCachedDecision
} from "../cache/decisionCache.js";

import { checkAdultDomain } from "../heuristics/adultDomain.js";
import { checkAllowlist } from "../heuristics/allowlist.js";
import { scanTextSources } from "../analysis/scanTextSources.js";
import { checkSafeBrowsing } from "../reputation/safeBrowsing.js";
import { checkUrlPath } from "../heuristics/urlPath.js";
import { geminiCheck } from "../analysis/geminiCheck.js";

import db from "../firebase.js";

const SAFE_BROWSING_KEY = process.env.SAFE_BROWSING_KEY;

const lastSeen = new Map();

const SOCIAL_MEDIA_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "snapchat.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "reddit.com",
  "tumblr.com"
];

function isSocialMedia(url) {
  try {
    const host = new URL(url).hostname;
    return SOCIAL_MEDIA_DOMAINS.some(d => host.includes(d));
  } catch {
    return false;
  }
}

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

function resolveAgePolicy(age) {
  if (age >= 9 && age <= 12) {
    return { class: "PRE_TEEN", threshold: 0.4 };
  }
  if (age >= 13 && age <= 15) {
    return { class: "TEEN", threshold: 0.5 };
  }
  if (age >= 16 && age <= 17) {
    return { class: "EARLY_ADULT", threshold: 0.6 };
  }
  return null;
}

async function logActivity({ url, verdict, riskScore, reasons }) {
  const now = Date.now();
  const sessionKey = global.SESSION_ID || "default";

  const prev = lastSeen.get(sessionKey);
  const durationMs = prev ? now - prev.time : 0;

  lastSeen.set(sessionKey, { time: now });

  await db.collection("activity").add({
    url,
    decision: verdict,
    reason: reasons.join(", "),
    riskScore,
    durationMs,
    timestamp: now,
    age: global.CHILD_AGE ?? null,
    ageClass: global.AGE_CLASS ?? null,
    sessionId: global.SESSION_ID ?? null
  });
}

export async function decideNavigation(input) {
  const { url, title = "", description = "", body = "" } = input;
  const isSearch = isSearchPage(url);

  const agePolicy =
    typeof global.CHILD_AGE === "number"
      ? resolveAgePolicy(global.CHILD_AGE)
      : null;

  if (
    agePolicy &&
    global.CHILD_AGE < 16 &&
    isSocialMedia(url)
  ) {
    const decision = {
      verdict: "block",
      riskScore: 0.9,
      reasons: ["Blocked by age-based policy"]
    };
    await logActivity({ url, ...decision });
    return decision;
  }

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
    setCachedDecision(url, decision);
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
    setCachedDecision(url, decision);
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
    setCachedDecision(url, decision);
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

  if (
    agePolicy &&
    keywordResult.score >= agePolicy.threshold
  ) {
    const decision = {
      verdict: "block",
      riskScore: keywordResult.score,
      reasons: keywordResult.reasons
    };
    await logActivity({ url, ...decision });
    setCachedDecision(url, decision);
    return decision;
  }

  if (agePolicy) {
    const geminiVerdict = await geminiCheck(
      `${title}\n${description}\n${body}`
    );
    if (geminiVerdict === "UNSAFE") {
      const decision = {
        verdict: "block",
        riskScore: 0.8,
        reasons: ["Blocked by AI content moderation"]
      };
      await logActivity({ url, ...decision });
      return decision;
    }
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
  setCachedDecision(url, decision);
  return decision;
}
