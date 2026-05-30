import type { SmoothContext } from "../../../pkg/types.js";

const content: Record<string, { title: string; date: string; body: string }> = {
  "hello-world": {
    title: "Hello World",
    date: "May 20, 2026",
    body: `This is smooth. A small server-side rendering framework built on Bun and React 19.

The goal is to make the internals understandable. Every file is short, every function does one thing, and the whole pipeline fits in your head.

You build an app in app/, run smooth build, and smooth start serves it. That's it.`,
  },
  "getting-started": {
    title: "Getting Started with SmoothJS",
    date: "May 22, 2026",
    body: `Install Bun, clone the repo, and run bun install. Then bun run dev.

Your app lives in app/. Add a page.tsx and it becomes a route. Add a layout.tsx and it wraps the page. Add a [param]/ folder and it becomes a dynamic route.

To fetch data on the server, export getServerSideProps from your page. The return value becomes the component's props.`,
  },
  "ssr-deep-dive": {
    title: "SSR Deep Dive: How SmoothJS Works",
    date: "May 25, 2026",
    body: `smooth build does three things: it walks app/ to discover routes, it uses Bun.build() to generate a client hydration bundle per route, and it writes a manifest.json that describes the full route table.

When a request comes in, the server reads the manifest to match the URL, imports the page module, runs getServerSideProps, calls renderToString, and sends back a full HTML document.

The browser gets that HTML, then the client bundle runs hydrateRoot. React attaches event handlers to the existing DOM without re-rendering. The props are passed through window.__SMOOTH_DATA__ so server and client stay in sync.`,
  },
};

interface BlogPostProps {
  slug: string;
}

export async function getServerSideProps(ctx: SmoothContext) {
  return {
    props: {
      slug: ctx.params.slug,
    },
  };
}

export default function BlogPostPage({ slug }: BlogPostProps) {
  const post = content[slug];

  if (!post) {
    return (
      <div>
        <p className="text-white/40 text-sm font-medium uppercase tracking-widest mb-4">
          404
        </p>
        <h1 className="text-4xl font-bold mb-4">Post not found</h1>
        <a href="/blog" className="text-white/50 hover:text-white text-sm transition-colors">
          ← Back to blog
        </a>
      </div>
    );
  }

  return (
    <div>
      <a
        href="/blog"
        className="text-white/40 hover:text-white text-sm transition-colors mb-8 inline-block"
      >
        ← Blog
      </a>
      <p className="text-white/30 text-sm mb-3">{post.date}</p>
      <h1 className="text-4xl font-bold mb-8">{post.title}</h1>
      <div className="space-y-4">
        {post.body.split("\n\n").map((para, i) => (
          <p key={i} className="text-white/60 leading-relaxed">
            {para}
          </p>
        ))}
      </div>
    </div>
  );
}
