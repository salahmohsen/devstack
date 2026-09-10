import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PassThrough } from "node:stream";

import { describe, expect, it } from "vitest";

import {
  fillCoverLetterTypst,
  renderCoverLetterPdfBytes,
  splitCoverLetterParagraphs
} from "#@/cover-letter";
import { formatLetterDate, splitCoverLetterParagraphs as splitFromDoc } from "#@/doc";
import { type SpawnFn } from "#@/spawn";
import { type CoverLetterPdfInput } from "#@/types";

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

function letterInput(overrides: Partial<CoverLetterPdfInput> = {}): CoverLetterPdfInput {
  return {
    candidateName: "Salah Mohsen",
    body: "I am writing to apply.\n\nI would welcome the chance to talk.",
    companyName: "Acme Corp",
    roleTitle: "Staff Engineer",
    date: new Date(2026, 7, 21),
    email: "salah@example.com",
    contacts: [
      { type: "github", value: "salah", sortOrder: 0 },
      { type: "email", value: "salah@example.com", sortOrder: 1 }
    ],
    ...overrides
  };
}

function binOnPath(bin: string): boolean {
  const result = spawnSync(bin, ["--version"], { encoding: "utf8", timeout: 3_000 });
  return result.error == null && result.status === 0;
}

const hasTypst = binOnPath("typst");

describe("doc re-exports (letter-format, browser-safe)", () => {
  it("re-exports splitCoverLetterParagraphs and formatLetterDate", () => {
    expect(splitFromDoc("A\n\nB")).toEqual(["A", "B"]);
    expect(formatLetterDate(new Date(2026, 8, 9))).toBe("September 9, 2026");
  });
});

describe("splitCoverLetterParagraphs", () => {
  it("splits blank-line paragraphs and joins soft line breaks", () => {
    expect(splitCoverLetterParagraphs("First para.\nStill first.\n\nSecond para.")).toEqual([
      "First para. Still first.",
      "Second para."
    ]);
  });

  it("keeps a single block as one paragraph when there are no blank lines", () => {
    expect(splitCoverLetterParagraphs("Line one\nLine two")).toEqual(["Line one Line two"]);
  });

  it("returns an empty list for whitespace-only bodies", () => {
    expect(splitCoverLetterParagraphs("  \n\n  ")).toEqual([]);
    expect(splitCoverLetterParagraphs("")).toEqual([]);
  });
});

describe("fillCoverLetterTypst", () => {
  it("omits Discord from the contact line and keeps shared formatter labels", () => {
    const source = fillCoverLetterTypst(
      letterInput({
        contacts: [
          { type: "github", value: "salah", sortOrder: 0 },
          { type: "discord", value: "user#1234", sortOrder: 1 },
          { type: "unknown", value: "nope", sortOrder: 2 }
        ]
      })
    );
    expect(source).toContain("github.com/salah");
    expect(source).toContain("salah@example.com");
    expect(source).not.toContain("user#1234");
    expect(source).not.toContain("discord");
    expect(source).not.toContain("nope");
  });

  it("sets UA-1 title/lang, A4, meta, and no Cover Letter heading", () => {
    const source = fillCoverLetterTypst(letterInput());
    expect(source).toMatch(/#set\s+document\s*\(\s*title:\s*name/);
    expect(source).toContain('#set text(lang: "en"');
    expect(source).toContain('#set page(paper: "a4")');
    expect(source).toContain("August 21, 2026");
    expect(source).toContain("Acme Corp");
    expect(source).toContain("Staff Engineer");
    expect(source).toMatch(/Re:/);
    expect(source).not.toMatch(/=\s*Cover Letter/);
    expect(source).not.toContain("Cover Letter");
    expect(source).toContain("I am writing to apply.");
    expect(source).toContain("I would welcome the chance to talk.");
  });
});

describe("renderCoverLetterPdfBytes", () => {
  it("throws PdfRenderFailedError and does not spawn when the body is empty", async () => {
    let spawned = false;
    const spawn: SpawnFn = (_command, args, options) => {
      spawned = true;
      return fakeChild({ code: 0 }, String(options.cwd), args);
    };

    await expect(
      renderCoverLetterPdfBytes(letterInput({ body: "  \n\n  " }), { spawn })
    ).rejects.toMatchObject({
      name: "PdfRenderFailedError",
      code: "PDF_RENDER_FAILED",
      message: "Cover letter body is empty"
    });
    expect(spawned).toBe(false);
  });

  it("writes filled Typst and compiles with UA-1", async () => {
    const seen: Array<{ command: string; args: readonly string[] }> = [];
    let compiledSource = "";

    const spawn: SpawnFn = (command, args, options) => {
      seen.push({ command, args });
      const cwd = String(options.cwd);
      return fakeChild(
        {
          onSpawn: () => {
            compiledSource = readFileSync(join(cwd, "letter.typ"), "utf8");
            mkdirSync(dirname(String(args[4])), { recursive: true });
            writeFileSync(String(args[4]), "%PDF-1.7\n%fake\n");
          }
        },
        cwd,
        args
      );
    };

    const bytes = await renderCoverLetterPdfBytes(letterInput(), { spawn });
    expect(Buffer.from(bytes).toString("utf8")).toContain("%PDF-1.7");
    expect(seen.map((c) => c.command)).toEqual(["typst"]);
    expect(seen[0]?.args.slice(0, 3)).toEqual(["compile", "--pdf-standard", "ua-1"]);
    expect(compiledSource).toContain('#set page(paper: "a4")');
    expect(compiledSource).not.toContain("Cover Letter");
    expect(compiledSource).toContain("github.com/salah");
  });

  it.skipIf(!hasTypst)(
    "compiles a fixture with ua-1 when typst is on PATH",
    async () => {
      const bytes = await renderCoverLetterPdfBytes(letterInput());
      expect(bytes.byteLength).toBeGreaterThan(100);
      expect(Buffer.from(bytes.subarray(0, 5)).toString("utf8")).toBe("%PDF-");
    },
    30_000
  );
});
