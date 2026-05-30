import type { SmoothContext } from "../../../pkg/types.js";

interface Character {
  id: number;
  name: string;
  status: "Alive" | "Dead" | "unknown";
  species: string;
  type: string;
  gender: string;
  image: string;
  origin: { name: string };
  location: { name: string };
  episode: string[];
}

interface CharacterDetailProps {
  character: Character;
}

const statusColor: Record<Character["status"], string> = {
  Alive: "bg-emerald-400",
  Dead: "bg-red-400",
  unknown: "bg-white/20",
};

const statusText: Record<Character["status"], string> = {
  Alive: "text-emerald-400",
  Dead: "text-red-400",
  unknown: "text-white/40",
};

export async function getServerSideProps(ctx: SmoothContext) {
  const res = await fetch(
    `https://rickandmortyapi.com/api/character/${ctx.params.id}`
  );
  const character = await res.json();
  return { props: { character: character as Character } };
}

export default function CharacterDetailPage({ character }: CharacterDetailProps) {
  return (
    <div>
      <a
        href="/characters"
        className="text-white/30 hover:text-white text-sm transition-colors mb-8 inline-block"
      >
        ← Characters
      </a>

      <div className="flex flex-col gap-6 md:flex-row md:gap-8 mb-10">
        <img
          src={character.image}
          alt={character.name}
          className="w-full h-64 md:w-48 md:h-48 rounded-2xl object-cover md:shrink-0"
        />
        <div className="flex flex-col justify-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">{character.name}</h1>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${statusColor[character.status]}`}
              />
              <span className={`text-sm font-medium ${statusText[character.status]}`}>
                {character.status}
              </span>
              <span className="text-white/20">·</span>
              <span className="text-white/50 text-sm">{character.species}</span>
              {character.type && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="text-white/40 text-sm">{character.type}</span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-3">
            <div>
              <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Gender</p>
              <p className="text-sm font-medium text-white/70">{character.gender}</p>
            </div>
            <div>
              <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Origin</p>
              <p className="text-sm font-medium text-white/70">{character.origin.name}</p>
            </div>
            <div>
              <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Location</p>
              <p className="text-sm font-medium text-white/70">{character.location.name}</p>
            </div>
            <div>
              <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Episodes</p>
              <p className="text-sm font-medium text-white/70">{character.episode.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8 pt-7">
        <p className="text-white/30 text-xs font-medium uppercase tracking-widest mb-4">
          Episode appearances
        </p>
        <div className="flex flex-wrap gap-2">
          {character.episode.map((url) => {
            const ep = url.split("/").at(-1);
            return (
              <span
                key={url}
                className="px-3 py-1 text-xs border border-white/10 rounded-full text-white/40"
              >
                EP {ep}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
