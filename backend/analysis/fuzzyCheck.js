import { FUZZY_VARIANTS } from "../config/fuzzyKeywords.js";

export function fuzzyCheck(text) {
  if (!text || typeof text !== "string") return false;

  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const pattern of FUZZY_VARIANTS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  return false;
}
