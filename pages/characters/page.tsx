import type { SmoothContext } from "../../pkg/types.js";

interface Character {
  id: number;
  name: string;
  status: "Alive" | "Dead" | "unknown";
  species: string;
  gender: string;
  image: string;
  location: { name: string };
  origin: { name: string };
}

interface CharactersProps {
  characters: Character[];
}

const statusColor: Record<Character["status"], string> = {
  Alive: "bg-emerald-400",
  Dead: "bg-red-400",
  unknown: "bg-white/30",
};

export async function getServerSideProps(_ctx: SmoothContext) {
  const res = await fetch("https://rickandmortyapi.com/api/character");
  const data = await res.json();
  return {
    props: {
      characters: data.results as Character[],
    },
  };
}

export default function CharactersPage({ characters }: CharactersProps) {
  return (
    <div>
      <p className="text-white/30 text-xs font-medium uppercase tracking-widest mb-4">
        Rick and Morty API
      </p>
      <h1 className="text-4xl font-bold mb-2">Characters</h1>
      <p className="text-white/40 text-sm mb-10">
        Fetched server-side from{" "}
        <span className="text-white/60 font-mono">rickandmortyapi.com</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {characters.map((char) => (
          <a
            key={char.id}
            href={`/characters/${char.id}`}
            className="group border border-white/8 rounded-xl overflow-hidden bg-white/2 hover:border-white/25 transition-colors flex md:flex-col"
          >
            <img
              src={char.image}
              alt={char.name}
              className="w-24 h-24 md:w-full md:h-auto md:aspect-square object-cover shrink-0 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="p-3 flex flex-col justify-center md:justify-start">
              <p className="font-semibold text-sm leading-tight mb-1.5 group-hover:text-white transition-colors">
                {char.name}
              </p>
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor[char.status]}`}
                />
                <span className="text-white/40 text-xs">
                  {char.status} · {char.species}
                </span>
              </div>
              <p className="text-white/25 text-xs truncate">{char.location.name}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
