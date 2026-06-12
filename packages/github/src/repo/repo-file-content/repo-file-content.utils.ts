import { Buffer } from "node:buffer";

export function mapGitHubRepoFileContent(data: unknown): string | null {
  return !Array.isArray(data) &&
    typeof data === "object" &&
    data !== null &&
    "content" in data &&
    typeof data.content === "string"
    ? Buffer.from(data.content, "base64").toString("utf-8")
    : null;
}
