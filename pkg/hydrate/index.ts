import React from "react";
import { hydrateRoot } from "react-dom/client";

export function hydrate(
  Page: React.ComponentType<Record<string, unknown>>,
  layouts: React.ComponentType<{ children: React.ReactNode }>[]
): void {
  const data = (window as any).__SMOOTH_DATA__;
  const props = data?.props ?? {};

  // Build tree inside-out: Page is the leaf, layouts[0] ends up outermost
  let tree: React.ReactElement = React.createElement(Page, props);
  for (let i = layouts.length - 1; i >= 0; i--) {
    tree = React.createElement(layouts[i], null, tree);
  }

  const rootElement = document.getElementById("_smooth");
  if (!rootElement) throw new Error('Root element with id="_smooth" not found');

  hydrateRoot(rootElement, tree);
}
