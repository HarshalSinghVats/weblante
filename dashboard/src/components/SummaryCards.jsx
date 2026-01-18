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

/* Screen-time wellbeing */
function getScreenTimeAdvice(timeMs) {
  const hours = timeMs / (1000 * 60 * 60);

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
      text: "Moderate screen time. Encourage regular breaks.",
      color: "text-yellow-300",
    };
  }

  return {
    text: "Healthy screen time usage today.",
    color: "text-green-400",
  };
}

/* Block-based wellbeing */
function getBlockBasedAdvice(blockedCount) {
  if (blockedCount >= 5) {
    return {
      text: "Frequent blocked attempts detected. Consider discussing safe browsing habits.",
      color: "text-red-400",
    };
  }

  if (blockedCount >= 3) {
    return {
      text: "Multiple blocked attempts observed. Monitor browsing behavior.",
      color: "text-yellow-300",
    };
  }

  if (blockedCount >= 1) {
    return {
      text: "Occasional unsafe attempts blocked. System is working as expected.",
      color: "text-yellow-300",
    };
  }

  return {
    text: "No unsafe browsing attempts detected.",
    color: "text-green-400",
  };
}

export default function SummaryCards() {
  const [allowed, setAllowed] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "activity"), (snap) => {
      let a = 0,
        b = 0,
        t = 0;

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

  const screenAdvice = getScreenTimeAdvice(time);
  const blockAdvice = getBlockBasedAdvice(blocked);

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

      {/* Screen Time + Time Wellbeing */}
      <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/25 p-4 shadow">
        <p className="text-xs text-white/70">Screen Time (Today)</p>
        <p className="text-white font-semibold mt-1">
          {formatTime(time)}
        </p>
        <p className={`text-sm mt-2 font-medium ${screenAdvice.color}`}>
          {screenAdvice.text}
        </p>
      </div>

      {/* Wellbeing Advice (Block-based) */}
      <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/25 p-4 shadow">
        <p className="text-xs text-white/70">Wellbeing Advice</p>
        <p className={`text-sm mt-2 font-medium ${blockAdvice.color}`}>
          {blockAdvice.text}
        </p>
      </div>
    </div>
  );
}
