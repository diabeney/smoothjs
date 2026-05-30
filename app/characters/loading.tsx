export default function CharactersLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-32 bg-white/10 rounded mb-4" />
      <div className="h-10 w-48 bg-white/10 rounded mb-2" />
      <div className="h-4 w-64 bg-white/10 rounded mb-10" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="border border-white/8 rounded-xl overflow-hidden bg-white/2 flex md:flex-col"
          >
            <div className="w-24 h-24 md:w-full md:aspect-square bg-white/10 shrink-0" />
            <div className="p-3 flex flex-col justify-center md:justify-start gap-2 flex-1">
              <div className="h-4 w-3/4 bg-white/10 rounded" />
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-white/10 shrink-0" />
                <div className="h-3 w-24 bg-white/10 rounded" />
              </div>
              <div className="h-3 w-1/2 bg-white/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
