import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

const PAGE_SIZE = 10;

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function getFavicon(url) {
  try {
    const d = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${d}`;
  } catch {
    return "/weblante-logo.png";
  }
}

export default function ActivityTable() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState([null]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPage(1);
  }, []);

  const loadPage = async (pageNum) => {
    setLoading(true);

    const cursor = cursors[pageNum - 1] || null;

    let q = query(
      collection(db, "activity"),
      orderBy("timestamp", "desc"),
      limit(PAGE_SIZE),
    );

    if (cursor) {
      q = query(
        collection(db, "activity"),
        orderBy("timestamp", "desc"),
        startAfter(cursor),
        limit(PAGE_SIZE),
      );
    }

    const snap = await getDocs(q);
    const docs = snap.docs;

    setRows(docs.map((d) => d.data()));

    if (docs.length === PAGE_SIZE && !cursors[pageNum]) {
      setCursors((prev) => {
        const copy = [...prev];
        copy[pageNum] = docs[docs.length - 1];
        return copy;
      });
    }

    setPage(pageNum);
    setLoading(false);
  };

  let lastSession = null;

  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/30 shadow">
      <div className="p-4 border-b border-white/30 text-white font-semibold">
        Recent Activity
      </div>

      {/* MOBILE */}
      <div className="sm:hidden divide-y divide-white/10">
        {rows.map((r, i) => {
          const showSession = r.sessionId && r.sessionId !== lastSession;
          lastSession = r.sessionId;

          return (
            <div key={i} className="p-4 space-y-2">
              {showSession && (
                <div className="text-xs text-white/70 border-b border-white/20 pb-1">
                  Session • Age {r.age ?? "?"}
                </div>
              )}

              <div className="flex items-center gap-2">
                <img
                  src={getFavicon(r.url)}
                  onError={(e) => {
                    e.currentTarget.src = "/weblante-logo.png";
                  }}
                  className="w-4 h-4 mt-1"
                />
                <span className="text-white font-semibold">
                  {getDomain(r.url)}
                </span>
              </div>

              <p className="text-xs text-white/80 break-all">{r.url}</p>

              <div className="flex justify-between text-xs text-white">
                <span
                  className={`font-semibold ${
                    r.decision === "block" ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {r.decision.toUpperCase()}
                </span>
                <span>Risk: {Math.round((r.riskScore || 0) * 100)}</span>
              </div>

              <p className="text-xs text-white/80">
                {new Date(r.timestamp).toLocaleTimeString()}
              </p>
            </div>
          );
        })}
      </div>

      {/* DESKTOP */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm text-white">
          <thead className="bg-white/5">
            <tr>
              <th className="p-3 text-left font-semibold">Site</th>
              <th className="p-3 text-center border-l border-white/30">
                Decision
              </th>
              <th className="p-3 text-center border-l border-white/30">Risk</th>
              <th className="p-3 text-center border-l border-white/30">Time</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => {
              const showSession = r.sessionId && r.sessionId !== lastSession;
              lastSession = r.sessionId;

              return (
                <>
                  {showSession && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-2 text-xs text-white/70 bg-white/5"
                      >
                        Session • Age {r.age ?? "?"}
                      </td>
                    </tr>
                  )}

                  <tr
                    key={i}
                    className="border-t border-white/10 hover:bg-white/5"
                  >
                    <td className="p-3">
                      <div className="flex gap-2">
                        <img
                          src={getFavicon(r.url)}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/weblante-logo.png";
                          }}
                          className="w-4 h-4 mt-1"
                        />
                        <div>
                          <p className="font-semibold">{getDomain(r.url)}</p>
                          <p className="text-xs text-white/70 break-all">
                            {r.url}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td
                      className={`p-3 text-center font-semibold border-l border-white/10 ${
                        r.decision === "block"
                          ? "text-red-400"
                          : "text-green-400"
                      }`}
                    >
                      {r.decision.toUpperCase()}
                    </td>

                    <td className="p-3 text-center border-l border-white/10">
                      {Math.round((r.riskScore || 0) * 100)}
                    </td>

                    <td className="p-3 text-center border-l border-white/10 text-white/80">
                      {new Date(r.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 grid grid-cols-3 items-center text-white">
        <button
          disabled={page === 1 || loading}
          onClick={() => loadPage(page - 1)}
          className="justify-self-start px-3 py-1 rounded bg-white/10 cursor-pointer border border-white/30 disabled:opacity-40"
        >
          Prev
        </button>

        <span className="justify-self-center text-sm font-semibold">
          Page {page}
        </span>

        <button
          disabled={!cursors[page] || loading}
          onClick={() => loadPage(page + 1)}
          className="justify-self-end px-3 py-1 rounded bg-white/10 cursor-pointer border border-white/30 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
