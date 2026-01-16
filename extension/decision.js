const params = new URLSearchParams(window.location.search);
const url = params.get("url");

if (!url) {
  document.body.innerText = "Invalid navigation context";
  throw new Error("Missing URL");
}

const loading = document.getElementById("state-loading");
const allowState = document.getElementById("state-allow");
const blockState = document.getElementById("state-block");

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

function extractSearchText(url) {
  try {
    const u = new URL(url);

    if (u.hostname.includes("google.") && u.pathname === "/search")
      return u.searchParams.get("q") || "";

    if (u.hostname.includes("search.brave.com") && u.pathname === "/search")
      return u.searchParams.get("q") || "";

    if (u.hostname.includes("youtube.") && u.pathname === "/results")
      return u.searchParams.get("search_query") || "";

    return "";
  } catch {
    return "";
  }
}

async function analyze() {
  try {
    const searchText = extractSearchText(url);

    const res = await fetch("http://localhost:3000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        title: searchText,
        description: searchText,
        body: ""
      })
    });

    const decision = await res.json();
    hide(loading);

    if (decision.verdict === "allow") {
      show(allowState);

      chrome.runtime.sendMessage({
        type: "ALLOW_THIS_URL",
        url
      });
    } else {
      document.getElementById("reason-block").innerText =
        decision.reasons?.[0] || "Blocked by safety policy";

      document.getElementById("score-block").innerText =
        `Risk score: ${decision.riskScore}`;

      show(blockState);
    }
  } catch {
    hide(loading);
    show(blockState);
    document.getElementById("reason-block").innerText =
      "Error analyzing site";
  }
}

analyze();
