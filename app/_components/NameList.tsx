import { useState } from "react";

interface Entry {
  id: number;
  name: string;
}

export default function NameList() {
  const [entries, setEntries] = useState<Entry[]>([{ id: 1, name: "Susana Taibobo" }]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  function addEntry() {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (entries.some((e) => e.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("Name already exists");
      return;
    }
    setEntries((prev) => [...prev, { id: Date.now(), name: trimmed }]);
    setInput("");
    setError("");
  }

  function removeEntry(id: number) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div>
      <p className="text-white/30 text-xs font-medium uppercase tracking-widest mb-6">
        Names
      </p>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && addEntry()}
          placeholder="Enter a name"
          className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
        />
        <button
          onClick={addEntry}
          className="px-5 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors"
        >
          Add
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-xs mb-4">{error}</p>
      )}

      {entries.length > 0 && (
        <div className="border border-white/10 rounded-xl overflow-hidden">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center gap-4 px-5 py-3 ${i < entries.length - 1 ? "border-b border-white/10" : ""}`}
            >
              <img
                src={`https://api.navii.dev/avatar/${encodeURIComponent(entry.name)}?size=32`}
                alt=""
                className="size-8 rounded-full shrink-0"
              />
              <span className="flex-1 text-sm text-white/80">{entry.name}</span>
              {entry.name !== "Susana Taibobo" && (
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="text-xs text-white/30 hover:text-red-400 transition-colors"
                >
                  X
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-white/20 text-sm">No names yet. Add one above.</p>
      )}
    </div>
  );
}
