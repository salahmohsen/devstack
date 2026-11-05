export function resolvePath(root: unknown, path: string): unknown {
  let node: unknown = root;
  for (const segment of path.split(".")) {
    if (typeof node !== "object" && typeof node !== "function") return undefined;
    if (node === null) return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return node;
}
