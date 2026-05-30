import type { ComponentType } from "react";

export interface RouteEntry {
  pattern: string;
  pagePath: string;
  layouts: string[];
  clientBundle: string;
  dynamic: boolean;
  params: string[];
  loadingPath?: string;
  loadingBundle?: string;
}

export interface ClientManifestEntry {
  pattern: string;
  loadingBundle: string;
}

export type Manifest = RouteEntry[];

export interface SmoothContext {
  params: Record<string, string>;
  query: Record<string, string>;
  req: Request;
}

export interface HeadMeta {
  title?: string;
  links?: Array<{ rel: string; href: string; [key: string]: string }>;
}

export interface PageModule {
  default: ComponentType<Record<string, unknown>>;
  getServerSideProps?: (
    ctx: SmoothContext
  ) => Promise<{ props: Record<string, unknown> }>;
  metadata?: HeadMeta;
}
