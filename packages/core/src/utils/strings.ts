/**
 * Removes any trailing `/` characters from the end of a string.
 *
 * Useful for normalising URLs that may or may not have a trailing slash
 * before joining paths.
 *
 * @example
 * stripTrailingSlashes("https://api.example.com/") // "https://api.example.com"
 * stripTrailingSlashes("/repos/foo///") // "/repos/foo"
 */
export function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Resolves a path string (or `URL`) against a base URL and returns the
 * absolute URL as a string. The path may be relative or absolute; an
 * absolute path replaces the base URL's path.
 *
 * @example
 * resolveRelativePathToAbsoluteUrl("/repos/foo", { baseUrl: "https://example.com" })
 * // "https://example.com/repos/foo"
 * resolveRelativePathToAbsoluteUrl(new URL("https://other.com/x"), { baseUrl: "https://example.com" })
 * // "https://other.com/x"
 */
export function resolveRelativePathToAbsoluteUrl(
  path: string | URL,
  { baseUrl }: { baseUrl: string | URL }
): string {
  return new URL(path, baseUrl).toString();
}

/**
 * Strips a URL down to a human-readable display form: removes the
 * `http(s)://` scheme, the trailing `/`, and a leading `www.`.
 *
 * Intended for showing URLs as plain text (e.g. in a resume PDF) rather
 * than as clickable links.
 *
 * @example
 * stripUrl("https://www.example.com/") // "example.com"
 * stripUrl("http://example.com") // "example.com"
 */
export function stripUrl(value: string): string {
  return stripTrailingSlashes(value.replace(/^https?:\/\//, "").replace(/^www\./, ""));
}
