// decisionEngine.js

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
import { fuzzyCheck } from "../analysis/fuzzyCheck.js";
import { normalizeUrl } from "../utils/normalizeUrl.js";

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

function isSocialMedia(normalizedUrl) {
  return SOCIAL_MEDIA_DOMAINS.some(d => normalizedUrl.includes(d));
}

/* ---------------- SAFE DECODER ---------------- */

function safeDecode(input, passes = 3) {
  if (!input) return "";
  let out = input;
  for (let i = 0; i < passes; i++) {
    try {
      const decoded = decodeURIComponent(out.replace(/\+/g, " "));
      if (decoded === out) break;
      out = decoded;
    } catch {
      break;
    }
  }
  return out;
}

/* ---------------- SEARCH QUERY EXTRACTION ---------------- */

function extractSearchQuery(rawUrl) {
  const decodedUrl = safeDecode(rawUrl);

  try {
    const u = new URL(decodedUrl);

    const SEARCH_PARAMS = ["q", "oq", "as_q", "query", "search"];

    for (const p of SEARCH_PARAMS) {
      const val = u.searchParams.get(p);
      if (val) {
        return safeDecode(val).trim();
      }
    }
  } catch {
    // fall through
  }

  // Regex fallback
  const match = decodedUrl.match(/(?:q|oq|as_q)=([^&]+)/i);
  if (match) {
    return safeDecode(match[1]).trim();
  }

  // Final fallback: scan raw URL text
  return "";
}

/* ---------------- AGE POLICY ---------------- */

function resolveAgePolicy(age) {
  if (age >= 9 && age <= 12) return { class: "PRE_TEEN", threshold: 0.4 };
  if (age >= 13 && age <= 15) return { class: "TEEN", threshold: 0.5 };
  if (age >= 16 && age <= 17) return { class: "EARLY_ADULT", threshold: 0.6 };
  return null;
}

/* ---------------- LOGGING ---------------- */

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

/* ---------------- MAIN DECISION ENGINE ---------------- */

export async function decideNavigation(input) {
  const rawUrl = input.url;
  const url = normalizeUrl(rawUrl);
  const { title = "", description = "", body = "" } = input;

  const searchQuery = extractSearchQuery(rawUrl);
  const isSearch = searchQuery.length > 0;

  const agePolicy =
    typeof global.CHILD_AGE === "number"
      ? resolveAgePolicy(global.CHILD_AGE)
      : null;

  if (agePolicy) {
    global.AGE_CLASS = agePolicy.class;
  }

  /* 🚫 ABSOLUTE EXPLICIT BLOCK — MUST RUN FIRST */
  if (
    isSearch &&
    /s[\W_]*x|sex|porn|xxx|xvideos|xnxx|hentai|nude|blowjob|fuck/i.test(searchQuery)
  ) {
    const decision = {
      verdict: "block",
      riskScore: 1.0,
      reasons: ["Explicit search intent detected"]
    };
    await logActivity({ url, ...decision });
    return decision;
  }

  /* 0️⃣ AGE-BASED SOCIAL MEDIA BLOCK */
  if (agePolicy && global.CHILD_AGE < 16 && isSocialMedia(url)) {
    const decision = {
      verdict: "block",
      riskScore: 0.9,
      reasons: ["Blocked by age-based policy"]
    };
    await logActivity({ url, ...decision });
    return decision;
  }

  /* 1️⃣ CACHE (NON-SEARCH ONLY) */
  if (!isSearch) {
    const cached = getCachedDecision(url);
    if (cached) return cached;
  }

  /* 2️⃣ HARD ADULT DOMAINS */
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

  /* 3️⃣ SAFE BROWSING */
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

  /* 4️⃣ URL PATH HEURISTICS */
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

  /* 5️⃣ KEYWORD ANALYSIS */
  const keywordResult = isSearch
    ? scanTextSources({ title, description, body: searchQuery })
    : scanTextSources(input);

  if (isSearch && keywordResult.hardBlock) {
    const decision = {
      verdict: "block",
      riskScore: 1.0,
      reasons: keywordResult.reasons
    };
    await logActivity({ url, ...decision });
    return decision;
  }

  if (isSearch && agePolicy && keywordResult.score >= agePolicy.threshold) {
    const decision = {
      verdict: "block",
      riskScore: keywordResult.score,
      reasons: keywordResult.reasons
    };
    await logActivity({ url, ...decision });
    return decision;
  }

  /* 6️⃣ FUZZY CHECK */
  if (
    isSearch &&
    agePolicy &&
    keywordResult.score === 0 &&
    fuzzyCheck(searchQuery)
  ) {
    const decision = {
      verdict: "block",
      riskScore: 0.55,
      reasons: ["Obfuscated explicit keyword detected"]
    };
    await logActivity({ url, ...decision });
    return decision;
  }

  /* 7️⃣ GEMINI — TRUE LAST RESORT */
  if (
    isSearch &&
    agePolicy &&
    keywordResult.score === 0 &&
    searchQuery.length > 3 &&
    !/^(how|what|why|when|where|tips|guide|learn)\b/i.test(searchQuery)
  ) {
    const verdict = await geminiCheck(
      searchQuery,
      agePolicy.class
    );

    if (verdict === "UNSAFE") {
      const decision = {
        verdict: "block",
        riskScore: 0.8,
        reasons: ["Blocked by AI content moderation"]
      };
      await logActivity({ url, ...decision });
      return decision;
    }
  }

  /* 8️⃣ ALLOWLIST (NON-SEARCH) */
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

  /* 9️⃣ DEFAULT ALLOW */
  const decision = {
    verdict: "allow",
    riskScore: keywordResult.score || 0,
    reasons: keywordResult.reasons || []
  };

  await logActivity({ url, ...decision });
  setCachedDecision(url, decision);
  return decision;
}
