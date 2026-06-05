export default function CharacterDetailLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-24 bg-white/10 rounded mb-8" />

      <div className="flex flex-col gap-6 md:flex-row md:gap-8 mb-10">
        <div className="w-full h-64 md:w-48 md:h-48 bg-white/10 rounded-2xl md:shrink-0" />

        <div className="flex flex-col justify-center gap-4 flex-1">
          <div>
            <div className="h-8 w-2/3 bg-white/10 rounded mb-2" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white/10" />
              <div className="h-4 w-28 bg-white/10 rounded" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="h-3 w-16 bg-white/10 rounded mb-1.5" />
                <div className="h-4 w-24 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/8 pt-7">
        <div className="h-3 w-32 bg-white/10 rounded mb-4" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-7 w-14 bg-white/10 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
