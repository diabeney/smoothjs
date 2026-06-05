import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  const isNegative = count < 0;
  const isPositive = count > 0;

  return (
    <div className="flex flex-col items-center gap-6 border border-white/10 rounded-2xl bg-white/0.03 px-14 py-10">
      <p className="text-white/30 text-xs font-medium uppercase tracking-widest">
        client state
      </p>

      <span
        className={[
          "text-8xl font-bold tabular-nums leading-none transition-colors duration-150",
          isNegative ? "text-red-400/80" : isPositive ? "text-white" : "text-white/50",
        ].join(" ")}
      >
        {count}
      </span>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setCount((c) => c - 1)}
          className="w-10 h-10 rounded-full border border-white/15 text-white/60 text-xl font-light hover:border-white/40 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center"
        >
          -
        </button>
        <button
          onClick={() => setCount(0)}
          className="px-4 py-1.5 text-xs font-medium text-white/30 hover:text-white/60 transition-colors rounded-full hover:bg-white/5"
        >
          reset
        </button>
        <button
          onClick={() => setCount((c) => c + 1)}
          className="w-10 h-10 rounded-full border border-white/15 text-white/60 text-xl font-light hover:border-white/40 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  );
}
