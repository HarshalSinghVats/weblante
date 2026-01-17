import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

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
    return "";
  }
}

export default function ActivityTable() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "activity"),
      orderBy("timestamp", "desc"),
      limit(25)
    );
    const unsub = onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => d.data()));
    });
    return () => unsub();
  }, []);

  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/25 shadow">
      <div className="p-4 border-b border-white/20 text-white font-medium">
        Recent Activity
      </div>

      {/* MOBILE */}
      <div className="sm:hidden divide-y divide-white/10">
        {rows.map((r, i) => (
          <div key={i} className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <img src={getFavicon(r.url)} className="w-4 h-4" />
              <span className="text-white font-semibold">
                {getDomain(r.url)}
              </span>
            </div>

            <p className="text-xs text-white/80 break-all">
              {r.url}
            </p>

            <div className="flex justify-between text-xs text-white">
              <span>
                Decision:{" "}
                <span
                  className={`font-semibold ${
                    r.decision === "block"
                      ? "text-red-400"
                      : "text-green-400"
                  }`}
                >
                  {r.decision.toUpperCase()}
                </span>
              </span>
              <span>
                Risk: {Math.round((r.riskScore || 0) * 100)}
              </span>
            </div>

            <p className="text-xs text-white/80">
              Time: {new Date(r.timestamp).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>

      {/* DESKTOP */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm text-white">
          <thead className="bg-white/5">
            <tr>
              <th className="p-3 text-left font-semibold">Site</th>
              <th className="p-3 text-center border-l border-white/20">
                Decision
              </th>
              <th className="p-3 text-center border-l border-white/20">
                Risk
              </th>
              <th className="p-3 text-center border-l border-white/20">
                Time
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className="border-t border-white/10 hover:bg-white/5"
              >
                <td className="p-3 max-w-[420px]">
                  <div className="flex gap-2">
                    <img src={getFavicon(r.url)} className="w-4 h-4 mt-1" />
                    <div>
                      <p className="font-semibold text-white">
                        {getDomain(r.url)}
                      </p>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
