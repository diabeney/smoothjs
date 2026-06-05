export default function AnimeDetailLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-24 bg-white/10 rounded mb-8" />

      <div className="flex flex-col gap-6 md:flex-row md:gap-8 mb-8">
        <div className="w-full h-64 md:w-44 md:h-64 bg-white/10 rounded-xl md:shrink-0" />

        <div className="flex flex-col justify-between py-1 flex-1">
          <div>
            <div className="h-3 w-16 bg-white/10 rounded mb-3" />
            <div className="h-8 w-3/4 bg-white/10 rounded mb-2" />
            <div className="h-4 w-1/3 bg-white/10 rounded mb-5" />

            <div className="flex flex-wrap gap-1.5 mb-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-6 w-16 bg-white/10 rounded-full" />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <div className="h-3 w-12 bg-white/10 rounded mb-1.5" />
                <div className="h-4 w-20 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/8 pt-7">
        <div className="h-3 w-20 bg-white/10 rounded mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-white/10 rounded w-full" />
          <div className="h-4 bg-white/10 rounded w-5/6" />
          <div className="h-4 bg-white/10 rounded w-4/5" />
          <div className="h-4 bg-white/10 rounded w-full" />
          <div className="h-4 bg-white/10 rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}
