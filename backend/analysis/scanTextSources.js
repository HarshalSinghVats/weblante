import { keywordScore } from "./keywordScorer.js";

export function scanTextSources({ url, title = "", description = "", body = "" }) {
  const combined = `
    ${url}
    ${title}
    ${description}
    ${body}
  `;

  return keywordScore(combined);
}
