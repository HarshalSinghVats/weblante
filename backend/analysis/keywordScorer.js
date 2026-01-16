import { ADULT_KEYWORDS } from "../config/adultKeywords.js";
import { normalizeText } from "./normalizeText.js";

export function keywordScore(rawText, { isSearch = false } = {}) {
  if (!rawText || (!isSearch && rawText.length < 50)) {
    return { score: 0, reasons: [], hardBlock: false };
  }


  const text = normalizeText(rawText);
  const tokens = text.split(" ");
  const total = tokens.length;

  let score = 0;
  let hardBlock = false;
  const reasons = [];

  const countHits = (list, weight, label, isHigh = false) => {
    const hits = list.filter(word => tokens.includes(word)).length;
    if (hits > 0) {
      score += Math.min(1, (hits / total) * weight);
      reasons.push(`Detected ${label} adult keywords`);
      // console.log("KEYWORD RAN");

      // 🚨 HARD SIGNAL FOR HIGH-RISK KEYWORDS
      if (isHigh) {
        hardBlock = true;
      }
    }
  };

  countHits(ADULT_KEYWORDS.high, 3.0, "high-risk", true);
  countHits(ADULT_KEYWORDS.medium, 1.5, "medium-risk");
  countHits(ADULT_KEYWORDS.low, 0.5, "low-risk");

  return {
    score: Math.min(score, 1),
    reasons,
    hardBlock
  };
}
