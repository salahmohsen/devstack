import { useQuery } from "@tanstack/react-query";
import { Code, Copy, Download, Eye, File, GitCommitHorizontal } from "lucide-react";
import { Suspense, use, useCallback, useMemo, useRef, useState } from "react";

import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { type GitHubTreeEntryCommit } from "@tsu-stack/github/types";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@tsu-stack/ui/components/tooltip";
import { cn } from "@tsu-stack/ui/lib/utils";

import { formatRelativeTime } from "@/shared/lib/format-relative-time";
import { highlightCode } from "@/shared/lib/highlight-code";

import { getGithubRepoFileContentQueryOptions } from "@/pages/github-repo/api/get-github-repo-file-content.query";
import { getGithubRepoTreeQueryOptions } from "@/pages/github-repo/api/get-github-repo-tree.query";
import { getGithubTreeEntryCommitsQueryOptions } from "@/pages/github-repo/api/get-github-tree-entry-commits.query";

const IMAGE_EXTENSIONS = new Set([
  "avif",
  "bmp",
  "gif",
  "ico",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp"
]);

function isImageFile(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(ext);
}

const EXT_TO_LANG: Record<string, string> = {
  bash: "bash",
  c: "c",
  cc: "cpp",
  cfg: "ini",
  cjs: "javascript",
  clj: "clojure",
  conf: "ini",
  cpp: "cpp",
  cs: "csharp",
  css: "css",
  cts: "typescript",
  cxx: "cpp",
  diff: "diff",
  dockerfile: "dockerfile",
  env: "bash",
  erb: "ruby",
  erl: "erlang",
  ex: "elixir",
  exs: "elixir",
  fish: "bash",
  go: "go",
  graphql: "graphql",
  gql: "graphql",
  h: "c",
  hpp: "cpp",
  hs: "haskell",
  htm: "html",
  html: "html",
  hxx: "cpp",
  ini: "ini",
  java: "java",
  js: "javascript",
  json: "json",
  json5: "json",
  jsonc: "json",
  jsx: "jsx",
  kt: "kotlin",
  kts: "kotlin",
  less: "less",
  lua: "lua",
  md: "markdown",
  mdx: "markdown",
  mjs: "javascript",
  mts: "typescript",
  patch: "diff",
  php: "php",
  pl: "perl",
  pm: "perl",
  prisma: "prisma",
  proto: "protobuf",
  ps1: "powershell",
  py: "python",
  pyi: "python",
  pyw: "python",
  r: "r",
  rb: "ruby",
  rs: "rust",
  sass: "sass",
  scala: "scala",
  scss: "scss",
  sh: "bash",
  sql: "sql",
  svg: "html",
  swift: "swift",
  tf: "hcl",
  tfvars: "hcl",
  toml: "toml",
  ts: "typescript",
  tsx: "tsx",
  vim: "viml",
  xhtml: "html",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  zsh: "bash"
};

const NAME_TO_LANG: Record<string, string> = {
  ".babelrc": "json",
  ".dockerignore": "bash",
  ".editorconfig": "ini",
  ".env": "bash",
  ".env.example": "bash",
  ".env.local": "bash",
  ".eslintrc": "json",
  ".gitattributes": "bash",
  ".gitignore": "bash",
  ".npmrc": "ini",
  ".prettierrc": "json",
  brewfile: "ruby",
  dockerfile: "dockerfile",
  gemfile: "ruby",
  justfile: "bash",
  makefile: "bash",
  rakefile: "ruby",
  vagrantfile: "ruby"
};

function detectLang(path: string): string {
  const name = path.split("/").pop() ?? "";
  const lower = name.toLowerCase();
  const nameMatch = NAME_TO_LANG[lower];
  if (nameMatch) return nameMatch;
  const ext = lower.split(".").pop() ?? "";
  return EXT_TO_LANG[ext] ?? "text";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function CodeFileView({
  currentRef,
  path,
  repo
}: {
  currentRef: string;
  path: string;
  repo: string;
}) {
  const { user } = useAuth();
  const isPrivate = !!user;

  const contentQuery = useQuery(
    getGithubRepoFileContentQueryOptions(repo, currentRef, path, isPrivate)
  );

  const fileName = path.split("/").pop() ?? path;
  const parentPath = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";

  const fileCommitQuery = useQuery(
    getGithubTreeEntryCommitsQueryOptions(repo, currentRef, parentPath, [fileName], isPrivate)
  );

  const parentTreeQuery = useQuery({
    ...getGithubRepoTreeQueryOptions(repo, currentRef, parentPath, isPrivate),
    enabled: parentPath.length > 0 || fileName.length > 0
  });

  const fileEntry = useMemo(
    () => parentTreeQuery.data?.find((e) => e.name === fileName),
    [parentTreeQuery.data, fileName]
  );

  const commit = fileCommitQuery.data?.[fileName];
  const isImage = isImageFile(path);
  const isSvg = path.toLowerCase().endsWith(".svg");

  if (isImage && !isSvg) {
    const rawUrl = `https://raw.githubusercontent.com/${repo}/${currentRef}/${path}`;
    return (
      <div className="flex flex-col gap-4">
        <FileCommitBar commit={commit} repo={repo} />
        <div className="overflow-hidden rounded-lg border">
          <FileViewHeader
            currentRef={currentRef}
            fileName={fileName}
            path={path}
            repo={repo}
            size={fileEntry?.size ?? null}
          />
          <div className="flex items-center justify-center bg-surface-1 p-8">
            <img src={rawUrl} alt={fileName} className="max-h-[70vh] max-w-full object-contain" />
          </div>
        </div>
      </div>
    );
  }

  if (contentQuery.isLoading) {
    return <CodeFileViewSkeleton fileName={fileName} />;
  }

  if (contentQuery.error || contentQuery.data == null) {
    return (
      <div className="rounded-lg border">
        <FileViewHeader fileName={fileName} />
        <div className="p-6 text-sm text-muted-foreground">Unable to load file content.</div>
      </div>
    );
  }

  const code = contentQuery.data.replace(/\n$/, "");
  const lang = detectLang(path);
  const lineCount = code.split("\n").length;

  if (isSvg) {
    return (
      <SvgFileView
        code={code}
        commit={commit}
        currentRef={currentRef}
        fileName={fileName}
        lang={lang}
        lineCount={lineCount}
        path={path}
        repo={repo}
        size={fileEntry?.size ?? null}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <FileCommitBar commit={commit} repo={repo} />
      <div className="overflow-hidden rounded-lg border">
        <FileViewHeader
          code={code}
          currentRef={currentRef}
          fileName={fileName}
          lineCount={lineCount}
          path={path}
          repo={repo}
          size={fileEntry?.size ?? null}
        />
        <div className="overflow-x-auto">
          <Suspense fallback={<PlainCode code={code} />}>
            <HighlightedCode code={code} lang={lang} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function SvgFileView({
  code,
  commit,
  currentRef,
  fileName,
  lang,
  lineCount,
  path,
  repo,
  size
}: {
  code: string;
  commit: GitHubTreeEntryCommit | null | undefined;
  currentRef: string;
  fileName: string;
  lang: string;
  lineCount: number;
  path: string;
  repo: string;
  size: number | null;
}) {
  const [mode, setMode] = useState<"preview" | "code">("preview");
  const rawUrl = `https://raw.githubusercontent.com/${repo}/${currentRef}/${path}`;

  return (
    <div className="flex flex-col gap-4">
      <FileCommitBar commit={commit} repo={repo} />
      <div className="overflow-hidden rounded-lg border">
        <FileViewHeader
          code={code}
          currentRef={currentRef}
          fileName={fileName}
          lineCount={mode === "code" ? lineCount : undefined}
          path={path}
          repo={repo}
          size={size}
        >
          <div className="flex items-center rounded-md border border-border/60">
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={cn(
                "flex items-center gap-1.5 rounded-l-md px-2 py-1 text-xs transition-colors",
                mode === "preview"
                  ? "bg-surface-1 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye size={13} />
              Preview
            </button>
            <button
              type="button"
              onClick={() => setMode("code")}
              className={cn(
                "flex items-center gap-1.5 rounded-r-md border-l border-border/60 px-2 py-1 text-xs transition-colors",
                mode === "code"
                  ? "bg-surface-1 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Code size={13} />
              Code
            </button>
          </div>
        </FileViewHeader>
        {mode === "preview" ? (
          <div className="flex items-center justify-center bg-surface-1 p-8">
            <img src={rawUrl} alt={fileName} className="max-h-[70vh] max-w-full object-contain" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Suspense fallback={<PlainCode code={code} />}>
              <HighlightedCode code={code} lang={lang} />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}

function FileViewHeader({
  children,
  code,
  currentRef,
  fileName,
  lineCount,
  path,
  repo,
  size
}: {
  children?: React.ReactNode;
  code?: string;
  currentRef?: string;
  fileName: string;
  lineCount?: number;
  path?: string;
  repo?: string;
  size?: number | null;
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleCopy = useCallback(async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
  }, [code]);

  return (
    <div className="flex items-center gap-2 border-b bg-surface-1 px-4 py-2.5 text-sm">
      <File size={14} className="shrink-0 text-muted-foreground" />
      <span className="font-medium text-foreground">{fileName}</span>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {lineCount != null && (
          <span>
            {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        )}
        {lineCount != null && size != null && <span aria-hidden="true">&middot;</span>}
        {size != null && <span>{formatFileSize(size)}</span>}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {children}
        {code && (
          <button
            type="button"
            onClick={handleCopy}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground"
            title={copied ? "Copied!" : "Copy file content"}
          >
            <Copy size={14} />
          </button>
        )}
        {repo && currentRef && path && (
          <a
            href={`https://raw.githubusercontent.com/${repo}/${currentRef}/${path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground"
            title="View raw"
          >
            <Download size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

function FileCommitBar({
  commit,
  repo
}: {
  commit: GitHubTreeEntryCommit | null | undefined;
  repo: string;
}) {
  if (!commit) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-surface-1 px-4 py-2.5 text-sm">
        <Skeleton className="size-5 rounded-full" />
        <Skeleton className="h-4 w-48 rounded" />
      </div>
    );
  }

  const shortSha = commit.sha.slice(0, 7);
  const firstLine = commit.message.split("\n")[0] ?? "No commit message";

  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface-1 px-4 py-2.5 text-sm">
      <a
        href={`https://github.com/${repo}/commit/${commit.sha}`}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 truncate text-left text-muted-foreground transition-colors hover:text-foreground hover:underline"
      >
        {firstLine}
      </a>
      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
        <Tooltip>
          <TooltipTrigger render={<span className="flex items-center gap-1" />}>
            <GitCommitHorizontal size={14} />
            <code>{shortSha}</code>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <code>{commit.sha}</code>
          </TooltipContent>
        </Tooltip>
        {commit.date && <span>{formatRelativeTime(commit.date)}</span>}
      </div>
    </div>
  );
}

function LineNumbers({ count }: { count: number }) {
  return (
    <div className="sticky left-0 z-10 flex flex-col items-end border-r bg-surface-1 px-3 py-3 text-muted-foreground select-none">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="leading-5">
          {i + 1}
        </span>
      ))}
    </div>
  );
}

function PlainCode({ code }: { code: string }) {
  const lineCount = code.split("\n").length;

  return (
    <div className="overflow-x-auto text-xs">
      <div className="flex min-w-fit">
        <LineNumbers count={lineCount} />
        <pre className="flex-1 p-3">
          <code className="leading-5 text-foreground">{code}</code>
        </pre>
      </div>
    </div>
  );
}

function HighlightedCode({ code, lang }: { code: string; lang: string }) {
  const html = use(highlightCode(code, lang));
  const lineCount = code.split("\n").length;

  return (
    <div className="overflow-x-auto text-xs">
      <div className="flex min-w-fit">
        <LineNumbers count={lineCount} />
        <div
          className="flex-1 [&_code]:text-xs [&_pre]:p-3 [&_pre]:leading-5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

const skeletonWidths = [
  "75%",
  "60%",
  "85%",
  "45%",
  "90%",
  "55%",
  "70%",
  "80%",
  "50%",
  "65%",
  "88%",
  "42%"
];

function CodeFileViewSkeleton({ fileName }: { fileName: string }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <FileViewHeader fileName={fileName} />
      <div className="flex flex-col gap-2 p-4">
        {skeletonWidths.map((width) => (
          <Skeleton key={width} className="h-4 rounded" style={{ width }} />
        ))}
      </div>
    </div>
  );
}
