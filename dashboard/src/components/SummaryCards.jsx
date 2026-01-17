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

function getWellbeingAdvice(timeMs, blockedCount) {
  const hours = timeMs / (1000 * 60 * 60);

  if (blockedCount >= 8) {
    return {
      text: "Repeated blocked attempts detected. Consider discussing safe browsing habits.",
      color: "text-red-400",
    };
  }

  if (hours > 3) {
    return {
      text: "Excessive screen time today. Recommend immediate breaks.",
      color: "text-red-400",
    };
  }

  if (hours > 2) {
    return {
      text: "High screen time today. Consider reducing device usage.",
      color: "text-yellow-300",
    };
  }

  if (hours > 1) {
    return {
      text: "Moderate screen time. Encourage breaks and offline activity.",
      color: "text-yellow-300",
    };
  }

  return {
    text: "All good. Healthy usage today. Check again later.",
    color: "text-green-400",
  };
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

  const advice = getWellbeingAdvice(time, blocked);

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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
      {/* Activity */}
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

      {/* Screen Time */}
      <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/25 p-4 shadow">
        <p className="text-xs text-white/70">Screen Time (Today)</p>
        <p className="text-white font-semibold mt-1">
          {formatTime(time)}
        </p>
      </div>

      {/* Wellbeing Advice */}
      <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/25 p-4 shadow">
        <p className="text-xs text-white/70">Wellbeing Advice</p>
        <p className={`text-sm mt-2 font-medium ${advice.color}`}>
          {advice.text}
        </p>
      </div>
    </div>
  );
}
