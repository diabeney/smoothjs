export default function AboutPage() {
  return (
    <div>
      <p className="text-white/40 text-sm font-medium uppercase tracking-widest mb-4">
        About
      </p>
      <h1 className="text-4xl font-bold mb-6">What is smooth?</h1>
      <p className="text-white/60 text-lg leading-relaxed mb-8">
        SmoothJS is a minimal SSR framework built on Bun and React 19. It
        exists to make the internals of a framework like Next.js tangible.
        Every part is readable and purposeful.
      </p>

      <div className="space-y-6 mb-12">
        {[
          {
            title: "Two-phase pipeline",
            body: "smooth build compiles your app into .smooth/: a manifest, client bundles, and CSS. smooth start serves from that output. Build once, serve fast.",
          },
          {
            title: "File-system router",
            body: "pages/page.tsx becomes /, pages/blog/[slug]/page.tsx becomes /blog/:slug. A single _app.tsx wraps every page. No route config.",
          },
          {
            title: "Server-side props",
            body: "Export getServerSideProps from any page to fetch data on the server before rendering. Props flow straight into your component.",
          },
          {
            title: "Bun-native",
            body: "Bundling, serving, and file I/O all go through Bun APIs. No webpack, no esbuild config, no vite plugin to wire up.",
          },
        ].map((item) => (
          <div key={item.title} className="border-l-2 border-white/20 pl-6">
            <h2 className="font-semibold text-lg mb-1">{item.title}</h2>
            <p className="text-white/50 text-sm leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>

      <div className="border border-white/10 rounded-xl p-6">
        <h2 className="font-semibold mb-3">Tech stack</h2>
        <div className="flex flex-wrap gap-2">
          {["Bun", "React 19", "TypeScript", "Tailwind v4", "renderToString", "hydrateRoot"].map(
            (t) => (
              <span
                key={t}
                className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-white/70"
              >
                {t}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
