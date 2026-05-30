import React from "react";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <div className="max-w-2xl">{children}</div>;
}
