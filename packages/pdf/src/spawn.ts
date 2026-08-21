import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";

import { PdfEngineUnavailableError, PdfRenderFailedError } from "#@/errors";
import { toRenderCvYaml } from "#@/map-rendercv-yaml";
import { type ResumePdfInput } from "#@/types";

export const PDF_RENDER_TIMEOUT_MS = 30_000;

/** RenderCV 2.8: skip PDF (and unused formats) while still writing the Typst source. */
export const RENDERCV_RENDER_ARGV = [
  "render",
  "cv.yaml",
  "--dont-generate-pdf",
  "--dont-generate-markdown",
  "--dont-generate-html",
  "--dont-generate-png",
  "--typst-path",
  "cv.typ"
] as const;

export type SpawnFn = (
  command: string,
  args: readonly string[],
  options: SpawnOptions
) => ChildProcess;

export type RenderResumePdfOptions = {
  spawn?: SpawnFn;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
};

const STDERR_CAP = 8_192;
const STDERR_MESSAGE_MAX = 800;

function isEnoent(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function typstStringLiteral(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ")}"`;
}

/** Drop YAML dumps and cap length so errors never echo the CV. */
export function shortStderr(raw: string): string {
  let text = raw.replace(/\r/g, "").trim();
  text = text.replace(/(?:^|\n)(?:cv|design|locale|settings)\s*:[\s\S]*$/m, "\n[yaml omitted]");
  text = text.replace(/\s+/g, " ").trim();
  if (text.length > STDERR_MESSAGE_MAX) text = `${text.slice(0, STDERR_MESSAGE_MAX)}…`;
  return text;
}

function killProcessGroup(child: ChildProcess): void {
  const pid = child.pid;
  if (pid == null) return;
  if (process.platform === "win32") {
    child.kill("SIGKILL");
    return;
  }
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      child.kill("SIGKILL");
    } catch {
      // already exited
    }
  }
}

function collectStream(
  stream: NodeJS.ReadableStream | null,
  onChunk: (chunk: string) => void
): void {
  if (!stream) return;
  stream.setEncoding("utf8");
  stream.on("data", onChunk);
}

async function runTimedCommand(
  command: string,
  args: readonly string[],
  options: {
    cwd: string;
    timeoutMs: number;
    env: NodeJS.ProcessEnv;
    spawnFn: SpawnFn;
  }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let child: ChildProcess;
    try {
      child = options.spawnFn(command, [...args], {
        cwd: options.cwd,
        env: options.env,
        stdio: ["ignore", "pipe", "pipe"],
        detached: process.platform !== "win32",
        windowsHide: true
      });
    } catch (error) {
      if (isEnoent(error)) {
        reject(new PdfEngineUnavailableError());
        return;
      }
      reject(error);
      return;
    }

    let stdout = "";
    let stderr = "";
    const append = (target: "stdout" | "stderr", chunk: string) => {
      const next = (target === "stdout" ? stdout : stderr) + chunk;
      const clipped = next.length > STDERR_CAP ? next.slice(-STDERR_CAP) : next;
      if (target === "stdout") stdout = clipped;
      else stderr = clipped;
    };
    collectStream(child.stdout, (chunk) => append("stdout", chunk));
    collectStream(child.stderr, (chunk) => append("stderr", chunk));

    let settled = false;
    let timedOut = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      timedOut = true;
      killProcessGroup(child);
    }, options.timeoutMs);

    child.on("error", (error) => {
      finish(() => {
        if (isEnoent(error)) {
          reject(new PdfEngineUnavailableError());
          return;
        }
        reject(error);
      });
    });

    child.on("close", (code, signal) => {
      finish(() => {
        if (timedOut) {
          reject(new PdfRenderFailedError(`PDF render timed out after ${options.timeoutMs}ms`));
          return;
        }
        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }
        const detail = shortStderr(stderr || stdout);
        const reason =
          signal != null ? `${command} signal ${signal}` : `${command} exit ${code ?? "unknown"}`;
        reject(
          new PdfRenderFailedError(
            detail ? `PDF render failed (${reason}): ${detail}` : `PDF render failed (${reason})`
          )
        );
      });
    });
  });
}

async function fileExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function findTypstSource(root: string): Promise<string | undefined> {
  const preferred = join(root, "cv.typ");
  if (await fileExists(preferred)) return preferred;

  const found: string[] = [];
  const visit = async (dir: string) => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile() && entry.name.endsWith(".typ")) {
        found.push(path);
      }
    }
  };
  await visit(root);
  return found[0];
}

function hasDocumentTitle(source: string): boolean {
  return /#set\s+document\s*\([^)]*\btitle\s*:/.test(source);
}

function hasDocumentLang(source: string): boolean {
  return (
    /#set\s+document\s*\([^)]*\blang\s*:/.test(source) ||
    /#set\s+text\s*\([^)]*\blang\s*:/.test(source)
  );
}

/** PDF/UA-1 requires a document title and language. Typst `document` has no `lang`. */
export function ensureUa1DocumentMetadata(source: string, title: string): string {
  const lines: string[] = [];
  if (!hasDocumentTitle(source)) {
    lines.push(`#set document(title: ${typstStringLiteral(title)})`);
  }
  if (!hasDocumentLang(source)) {
    lines.push(`#set text(lang: "en")`);
  }
  return lines.length === 0 ? source : `${lines.join("\n")}\n${source}`;
}

function rethrowRenderError(error: unknown): never {
  if (error instanceof PdfEngineUnavailableError || error instanceof PdfRenderFailedError) {
    throw error;
  }
  const message = error instanceof Error ? error.message : "unknown error";
  throw new PdfRenderFailedError(`PDF render failed: ${shortStderr(message)}`);
}

export async function renderResumePdfBytes(
  input: ResumePdfInput,
  options: RenderResumePdfOptions = {}
): Promise<Uint8Array> {
  const timeoutMs = options.timeoutMs ?? PDF_RENDER_TIMEOUT_MS;
  const spawnFn = options.spawn ?? spawn;
  const env = { ...process.env, ...options.env };
  const tmp = await mkdtemp(join(tmpdir(), "resume-pdf-"));

  try {
    await writeFile(join(tmp, "cv.yaml"), toRenderCvYaml(input), "utf8");

    await runTimedCommand("rendercv", RENDERCV_RENDER_ARGV, {
      cwd: tmp,
      timeoutMs,
      env,
      spawnFn
    });

    const typPath = await findTypstSource(tmp);
    if (!typPath) {
      throw new PdfRenderFailedError("PDF render failed: no Typst source generated");
    }

    const source = await readFile(typPath, "utf8");
    const withMeta = ensureUa1DocumentMetadata(source, input.profile.name);
    if (withMeta !== source) {
      await writeFile(typPath, withMeta, "utf8");
    }

    const pdfPath = join(dirname(typPath), `${basename(typPath, extname(typPath))}.pdf`);
    await runTimedCommand("typst", ["compile", "--pdf-standard", "ua-1", typPath, pdfPath], {
      cwd: tmp,
      timeoutMs,
      env,
      spawnFn
    });

    if (!(await fileExists(pdfPath))) {
      throw new PdfRenderFailedError("PDF render failed: Typst produced no PDF");
    }

    const bytes = await readFile(pdfPath);
    return Uint8Array.from(bytes);
  } catch (error) {
    return rethrowRenderError(error);
  } finally {
    try {
      await rm(tmp, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
}
