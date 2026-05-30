const posts = [
  {
    slug: "hello-world",
    title: "Hello World",
    date: "May 20, 2026",
    summary: "The first post. An introduction to smooth and why it exists.",
  },
  {
    slug: "getting-started",
    title: "Getting Started with SmoothJS",
    date: "May 22, 2026",
    summary: "Set up your first smooth app from scratch in under five minutes.",
  },
  {
    slug: "ssr-deep-dive",
    title: "SSR Deep Dive: How SmoothJS Works",
    date: "May 25, 2026",
    summary: "A look inside the build pipeline, the manifest, and how renderToString hands off to hydrateRoot.",
  },
];

export default function BlogPage() {
  return (
    <div>
      <p className="text-white/40 text-sm font-medium uppercase tracking-widest mb-4">
        Blog
      </p>
      <h1 className="text-4xl font-bold mb-10">Writing</h1>
      <ul className="space-y-px">
        {posts.map((post) => (
          <li key={post.slug}>
            <a
              href={`/blog/${post.slug}`}
              className="group flex items-start justify-between gap-8 py-5 border-b border-white/10 hover:border-white/30 transition-colors"
            >
              <div>
                <p className="font-medium group-hover:text-white/90 transition-colors">
                  {post.title}
                </p>
                <p className="text-white/40 text-sm mt-1 leading-relaxed">
                  {post.summary}
                </p>
              </div>
              <span className="text-white/30 text-sm shrink-0 mt-0.5">{post.date}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
