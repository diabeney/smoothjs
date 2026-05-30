export default function AnimeLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-20 bg-white/10 rounded mb-4" />
      <div className="h-10 w-40 bg-white/10 rounded mb-2" />
      <div className="h-4 w-56 bg-white/10 rounded mb-10" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="border border-white/8 rounded-xl overflow-hidden bg-white/2"
          >
            <div className="aspect-video bg-white/10" />
            <div className="p-3">
              <div className="h-4 w-4/5 bg-white/10 rounded mb-1.5" />
              <div className="h-3 w-1/2 bg-white/10 rounded mb-3" />
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 bg-white/10 rounded" />
                <div className="h-3 w-10 bg-white/10 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
