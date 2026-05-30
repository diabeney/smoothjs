import React from "react";
import type { HeadMeta } from "../pkg/types.js";

export const metadata: HeadMeta = {
  links: [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap",
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-8 py-4 flex items-center justify-between">
          <a href="/" className="font-semibold text-sm tracking-tight">smooth</a>
          <div className="flex gap-7 text-sm text-white/50">
            <a href="/about" className="hover:text-white transition-colors">About</a>
            <a href="/blog" className="hover:text-white transition-colors">Blog</a>
            <a href="/characters" className="hover:text-white transition-colors">Characters</a>
            <a href="/anime" className="hover:text-white transition-colors">Anime</a>
          </div>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-8 py-12">{children}</main>
    </div>
  );
}
