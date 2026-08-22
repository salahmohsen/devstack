import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PassThrough } from "node:stream";

import { describe, expect, it } from "vitest";

import { PdfEngineUnavailableError, PdfRenderFailedError } from "#@/errors";
import {
  ensureUa1DocumentMetadata,
  RENDERCV_RENDER_ARGV,
  renderResumePdfBytes,
  shortStderr,
  type SpawnFn
} from "#@/spawn";
import { type ResumePdfInput } from "#@/types";

type FakeChildOpts = {
  code?: number | null;
  stderr?: string;
  stdout?: string;
  enoent?: boolean;
  onSpawn?: (cwd: string, args: readonly string[]) => void;
};

function fakeChild(opts: FakeChildOpts, cwd: string, args: readonly string[]): ReturnType<SpawnFn> {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const child = Object.assign(new EventEmitter(), {
    stdout,
    stderr,
    pid: opts.enoent ? undefined : 4242,
    kill: () => {
      queueMicrotask(() => {
        stdout.end();
        stderr.end();
        child.emit("close", null, "SIGKILL");
      });
      return true;
    }
  }) as unknown as ReturnType<SpawnFn>;

  queueMicrotask(() => {
    if (opts.enoent) {
      const error = Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" });
      child.emit("error", error);
      stdout.end();
      stderr.end();
      child.emit("close", null, null);
      return;
    }
    try {
      opts.onSpawn?.(cwd, args);
    } catch {
      stdout.end();
      stderr.end();
      child.emit("close", 1, null);
      return;
    }
    if (opts.stdout) stdout.write(opts.stdout);
    if (opts.stderr) stderr.write(opts.stderr);
    stdout.end();
    stderr.end();
    child.emit("close", opts.code ?? 0, null);
  });

  return child;
}

function thinInput(overrides: Partial<ResumePdfInput> = {}): ResumePdfInput {
  return {
    profile: overrides.profile ?? { name: 'Salah "Mohsen"', email: "salah@example.com" },
    summary: overrides.summary ?? "I build typed products.",
    professionalSummary: overrides.professionalSummary,
    portfolio: {
      experiences: [],
      projects: [],
      stacks: [],
      contacts: [],
      ...overrides.portfolio
    }
  };
}

function binOnPath(bin: string): boolean {
  const result = spawnSync(bin, ["--version"], { encoding: "utf8", timeout: 3_000 });
  return result.error == null && result.status === 0;
}

const hasPdfEngines = binOnPath("rendercv") && binOnPath("typst");

describe("renderResumePdfBytes", () => {
  it("throws PdfEngineUnavailableError when spawn reports ENOENT", async () => {
    let rendercvArgs: readonly string[] = [];
    const spawn: SpawnFn = (command, args, options) => {
      if (command === "rendercv") rendercvArgs = args;
      return fakeChild({ enoent: true }, String(options.cwd), args);
    };

    await expect(renderResumePdfBytes(thinInput(), { spawn })).rejects.toMatchObject({
      name: "PdfEngineUnavailableError",
      code: "PDF_ENGINE_UNAVAILABLE"
    });
    expect(rendercvArgs).toEqual([...RENDERCV_RENDER_ARGV]);
  });

  it("throws PdfEngineUnavailableError when PATH has no rendercv or typst", async () => {
    await expect(
      renderResumePdfBytes(thinInput(), { env: { PATH: "/var/empty-no-pdf-engines" } })
    ).rejects.toBeInstanceOf(PdfEngineUnavailableError);
  });

  it("throws PdfRenderFailedError with short stderr and no YAML dump", async () => {
    const spawn: SpawnFn = (_command, args, options) =>
      fakeChild(
        {
          code: 1,
          stderr:
            "There are some errors in the input file!\ncv:\n  name: Salah Mohsen\n  email: secret@example.com\n"
        },
        String(options.cwd),
        args
      );

    const error = await renderResumePdfBytes(thinInput(), { spawn }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PdfRenderFailedError);
    expect((error as PdfRenderFailedError).code).toBe("PDF_RENDER_FAILED");
    expect((error as Error).message).toContain("PDF render failed");
    expect((error as Error).message).not.toContain("secret@example.com");
    expect((error as Error).message).not.toContain("name: Salah");
    expect((error as Error).message).toContain("[yaml omitted]");
  });

  it("invokes rendercv then typst UA-1 and prepends document title/lang", async () => {
    const seen: Array<{ command: string; args: readonly string[] }> = [];
    let compiledSource = "";

    const spawn: SpawnFn = (command, args, options) => {
      seen.push({ command, args });
      const cwd = String(options.cwd);
      return fakeChild(
        {
          onSpawn: () => {
            if (command === "rendercv") {
              writeFileSync(
                join(cwd, "cv.typ"),
                '#import "@preview/rendercv:0.3.0": *\n= Salah\n',
                "utf8"
              );
              return;
            }
            compiledSource = readFileSync(String(args[3]), "utf8");
            mkdirSync(dirname(String(args[4])), { recursive: true });
            writeFileSync(String(args[4]), "%PDF-1.7\n%fake\n");
          }
        },
        cwd,
        args
      );
    };

    const bytes = await renderResumePdfBytes(thinInput(), { spawn });
    expect(Buffer.from(bytes).toString("utf8")).toContain("%PDF-1.7");
    expect(seen.map((c) => c.command)).toEqual(["rendercv", "typst"]);
    expect(seen[0]?.args).toEqual([...RENDERCV_RENDER_ARGV]);
    expect(seen[1]?.args.slice(0, 3)).toEqual(["compile", "--pdf-standard", "ua-1"]);
    expect(compiledSource).toMatch(/^#set document\(title: "Salah \\"Mohsen\\""\)/);
    expect(compiledSource).toContain('#set text(lang: "en")');
  });

  it("does not rewrite Typst that already sets document title and lang", async () => {
    let compiledSource = "";
    const spawn: SpawnFn = (command, args, options) => {
      const cwd = String(options.cwd);
      return fakeChild(
        {
          onSpawn: () => {
            if (command === "rendercv") {
              writeFileSync(
                join(cwd, "cv.typ"),
                '#set document(title: "Existing")\n#set text(lang: "en")\n= CV\n',
                "utf8"
              );
              return;
            }
            compiledSource = readFileSync(String(args[3]), "utf8");
            writeFileSync(String(args[4]), "%PDF-1.7\n");
          }
        },
        cwd,
        args
      );
    };

    await renderResumePdfBytes(thinInput(), { spawn });
    expect(compiledSource.startsWith('#set document(title: "Existing")')).toBe(true);
    expect(compiledSource).not.toContain("Salah");
  });

  it("throws PdfRenderFailedError when rendercv writes no .typ", async () => {
    const spawn: SpawnFn = (_command, args, options) =>
      fakeChild({ code: 0 }, String(options.cwd), args);
    await expect(renderResumePdfBytes(thinInput(), { spawn })).rejects.toMatchObject({
      name: "PdfRenderFailedError",
      message: "PDF render failed: no Typst source generated"
    });
  });

  it.skipIf(!hasPdfEngines)(
    "compiles a thin CV with ua-1 when rendercv and typst are on PATH",
    async () => {
      const bytes = await renderResumePdfBytes(thinInput());
      expect(bytes.byteLength).toBeGreaterThan(100);
      expect(Buffer.from(bytes.subarray(0, 5)).toString("utf8")).toBe("%PDF-");
    },
    30_000
  );
});

describe("ensureUa1DocumentMetadata", () => {
  it("prepends title and lang when missing", () => {
    expect(ensureUa1DocumentMetadata("= CV\n", "Ada")).toBe(
      '#set document(title: "Ada")\n#set text(lang: "en")\n= CV\n'
    );
  });
});

describe("shortStderr", () => {
  it("omits YAML and truncates", () => {
    expect(shortStderr("boom\ncv:\n  name: secret\n")).toBe("boom [yaml omitted]");
  });
});
