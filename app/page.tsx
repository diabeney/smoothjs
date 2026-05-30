import Counter from "./_components/Counter.js";
import NameList from "./_components/NameList.js";
import type { SmoothContext } from "../pkg/types.js";

interface HomeProps {
  timestamp: string;
}

export async function getServerSideProps(_ctx: SmoothContext) {
  return {
    props: {
      timestamp: new Date().toISOString(),
    },
  };
}

export default function HomePage({ timestamp }: HomeProps) {
  return (
    <div>
      <div className="mb-14">
        <p className="text-white/30 text-xs font-medium uppercase tracking-widest mb-5">
          SSR Framework
        </p>
        <h1 className="text-5xl font-bold leading-tight tracking-tight mb-5">
          Build with smooth.
        </h1>
        <p className="text-white/50 text-base leading-relaxed max-w-lg">
          A minimal server-side rendering framework built on Bun and React 19.
          Fast by default. No config required.
        </p>
        <div className="flex gap-3 mt-7">
          <a
            href="/blog"
            className="px-5 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors"
          >
            Read the blog
          </a>
          <a
            href="/about"
            className="px-5 py-2 border border-white/15 text-sm text-white/70 font-medium rounded-lg hover:border-white/35 hover:text-white transition-all"
          >
            Learn more
          </a>
        </div>
      </div>

      <div className="mb-14">
        <NameList />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-14">
        <Counter />
        <div className="grid gap-3">
          {[
            { label: "File-system routing", desc: "Routes map to files. No config." },
            { label: "Server-side props", desc: "Fetch data before the page renders." },
            { label: "Full hydration", desc: "React takes over on the client." },
          ].map((f) => (
            <div key={f.label} className="border border-white/8 rounded-xl p-5 bg-white/2">
              <p className="text-sm font-semibold mb-1.5">{f.label}</p>
              <p className="text-white/40 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-white/15 text-xs">
        Rendered at {timestamp}
      </p>
    </div>
  );
}
