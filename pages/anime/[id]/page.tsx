import type { SmoothContext } from "../../../pkg/types.js";

interface AnimeDetail {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  images: { jpg: { large_image_url: string } };
  score: number | null;
  scored_by: number | null;
  rank: number | null;
  episodes: number | null;
  status: string;
  aired: { string: string };
  duration: string;
  rating: string | null;
  synopsis: string | null;
  genres: { name: string }[];
  studios: { name: string }[];
  themes: { name: string }[];
  trailer: { embed_url: string | null };
}

interface AnimeDetailProps {
  anime: AnimeDetail;
}

export async function getServerSideProps(ctx: SmoothContext) {
  const res = await fetch(`https://api.jikan.moe/v4/anime/${ctx.params.id}`);
  const data = await res.json();
  return { props: { anime: data.data as AnimeDetail } };
}

export async function getSmoothData() {
  return "hello"
}

export default function AnimeDetailPage({ anime }: AnimeDetailProps) {
  const tags = [
    ...anime.genres.map((g) => g.name),
    ...anime.themes.map((t) => t.name),
  ];

  return (
    <div>
      <a
        href="/anime"
        className="text-white/30 hover:text-white text-sm transition-colors mb-8 inline-block"
      >
        ← Top Anime
      </a>

      <div className="flex flex-col gap-6 md:flex-row md:gap-8 mb-8">
        <img
          src={anime.images.jpg.large_image_url}
          alt={anime.title}
          className="w-full h-64 md:w-44 md:h-64 object-cover rounded-xl md:shrink-0"
        />
        <div className="flex flex-col justify-between py-1">
          <div>
            {anime.rank && (
              <p className="text-white/30 text-xs font-medium uppercase tracking-widest mb-3">
                Rank #{anime.rank}
              </p>
            )}
            <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-1">
              {anime.title_english ?? anime.title}
            </h1>
            {anime.title_japanese && (
              <p className="text-white/30 text-sm mb-4">{anime.title_japanese}</p>
            )}

            <div className="flex flex-wrap gap-1.5 mb-5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 text-xs border border-white/10 rounded-full text-white/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {anime.score && (
              <div>
                <p className="text-white/30 text-xs mb-0.5">Score</p>
                <p className="font-semibold text-amber-400/80">
                  ✦ {anime.score}{" "}
                  <span className="text-white/30 text-xs font-normal">
                    ({(anime.scored_by! / 1000).toFixed(0)}k)
                  </span>
                </p>
              </div>
            )}
            <div>
              <p className="text-white/30 text-xs mb-0.5">Episodes</p>
              <p className="font-medium">{anime.episodes ?? "unknown"}</p>
            </div>
            <div>
              <p className="text-white/30 text-xs mb-0.5">Status</p>
              <p className="font-medium text-white/70">{anime.status}</p>
            </div>
            <div>
              <p className="text-white/30 text-xs mb-0.5">Aired</p>
              <p className="font-medium text-white/70">{anime.aired.string}</p>
            </div>
            {anime.studios.length > 0 && (
              <div>
                <p className="text-white/30 text-xs mb-0.5">Studio</p>
                <p className="font-medium text-white/70">
                  {anime.studios.map((s) => s.name).join(", ")}
                </p>
              </div>
            )}
            {anime.duration && (
              <div>
                <p className="text-white/30 text-xs mb-0.5">Duration</p>
                <p className="font-medium text-white/70">{anime.duration}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {anime.synopsis && (
        <div className="border-t border-white/8 pt-7">
          <p className="text-white/30 text-xs font-medium uppercase tracking-widest mb-3">
            Synopsis
          </p>
          <p className="text-white/55 leading-relaxed text-[15px]">{anime.synopsis}</p>
        </div>
      )}
    </div>
  );
}
