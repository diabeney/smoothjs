import type { SmoothContext } from "../../pkg/types.js";

interface Anime {
  mal_id: number;
  title: string;
  title_english: string | null;
  images: { jpg: { large_image_url: string } };
  score: number | null;
  episodes: number | null;
  status: string;
  rank: number;
  genres: { name: string }[];
}

interface AnimeListProps {
  anime: Anime[];
}

export async function getServerSideProps(_ctx: SmoothContext) {
  const res = await fetch("https://api.jikan.moe/v4/top/anime?limit=20");
  const data = await res.json();
  const anime = (data.data as Anime[]).sort((a, b) =>
    (a.title_english ?? a.title).localeCompare(b.title_english ?? b.title)
  );
  
  return { props: { anime } };
}

export default function AnimePage({ anime }: AnimeListProps) {
  return (
    <div>
      <p className="text-white/30 text-xs font-medium uppercase tracking-widest mb-4">
        Jikan API
      </p>
      <h1 className="text-4xl font-bold mb-2">Top Anime</h1>
      <p className="text-white/40 text-sm mb-10">
        Fetched server-side from{" "}
        <span className="font-mono text-white/60">api.jikan.moe</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {anime.map((a) => (
          <a
            key={a.mal_id}
            href={`/anime/${a.mal_id}`}
            className="group border border-white/8 rounded-xl overflow-hidden bg-white/2 hover:border-white/25 transition-colors"
          >
            <div className="aspect-video overflow-hidden bg-white/5">
              <img
                src={a.images.jpg.large_image_url}
                alt={a.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-3">
              <p className="font-semibold text-sm leading-snug mb-2 line-clamp-2">
                {a.title_english ?? a.title}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-white/30 text-xs">
                  {a.episodes ? `${a.episodes} eps` : "ongoing"}
                </span>
                {a.score && (
                  <span className="text-amber-400/80 text-xs font-medium">
                    ✦ {a.score}
                  </span>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
