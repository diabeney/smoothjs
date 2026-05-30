export function clientBundleToURL(clientBundle: string): string {
  const prefix = ".smooth/client/";
  const relative = clientBundle.startsWith(prefix)
    ? clientBundle.slice(prefix.length)
    : clientBundle;
  return `/_smooth/${relative}`;
}
