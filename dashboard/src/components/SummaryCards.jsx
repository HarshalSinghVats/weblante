import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip);

function formatTime(ms) {
  if (!ms || ms <= 0) return "00 hrs 00 min 00 sec";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)} hrs ${pad(m)} min ${pad(sec)} sec`;
}

function classifyScreenTime(ms) {
  const hours = ms / (1000 * 60 * 60);

  if (hours < 1) {
    return { label: "Healthy usage", color: "text-green-400" };
  }

  if (hours < 3) {
    return { label: "Moderate usage", color: "text-yellow-400" };
  }

  return { label: "Excessive usage", color: "text-red-400" };
}

export default function SummaryCards() {
  const [allowed, setAllowed] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "activity"), (snap) => {
      let a = 0, b = 0, t = 0;
      snap.forEach((d) => {
        const x = d.data();
        if (x.decision === "allow") a++;
        if (x.decision === "block") b++;
        t += x.durationMs || 0;
      });
      setAllowed(a);
      setBlocked(b);
      setTime(t);
    });
    return () => unsub();
  }, []);

  const chartData = {
    datasets: [
      {
        data: [allowed, blocked],
        backgroundColor: ["#22c55e", "#ef4444"],
        cutout: "70%",
        borderWidth: 0,
      },
    ],
  };

  const screenTimeStatus = classifyScreenTime(time);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
      {/* Activity Summary */}
      <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/25 p-4 flex items-center justify-between shadow">
        <div>
          <p className="text-xs text-white/70">Activity</p>
          <p className="text-white font-semibold">
            <span className="text-green-400">{allowed}</span> Allowed ·{" "}
            <span className="text-red-400">{blocked}</span> Blocked
          </p>
        </div>
        <div className="w-20 h-20">
          <Doughnut data={chartData} />
        </div>
      </div>

      {/* Screen Time + Classification */}
      <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/25 p-4 shadow">
        <p className="text-xs text-white/70">Screen Time (Today)</p>

        <p className="text-lg text-white font-semibold">
          {formatTime(time)}
        </p>

        <p className={`text-sm font-medium ${screenTimeStatus.color}`}>
          {screenTimeStatus.label}
        </p>
      </div>
    </div>
  );
}
