# pdfnative for tagged, ATS-safe resume PDFs

Replace `@react-pdf/renderer` with `pdfnative` + `pdfnative-react` for PDF
generation. The motivating gap: @react-pdf cannot produce tagged PDFs
(no `/StructTreeRoot`), which is the foundation for screen-reader
accessibility and reliable ATS text extraction. pdfnative is the only
library in the current ecosystem that combines tagged PDF/PDF-A output
with Cloudflare Workers compatibility, zero runtime dependencies, and a
declarative React component model.

## Context

The resume generate/download feature currently uses `@react-pdf/renderer`
v4.5.1 server-side in the TanStack Start Cloudflare Worker. This works
and produces text-based PDFs that most ATS systems can parse, but it has
three unreconciled limitations:

1. **No tagged PDFs.** @react-pdf/renderer does not expose the underlying
   PDFKit `tagged: true` option. The generated PDF has no structure tree,
   so ATS parsers must guess reading order from spatial coordinates
   rather than reading explicit `/H1`, `/P`, `/Table` roles.
2. **Workers bundle weight.** @react-pdf ships PDFKit plus a React
   reconciler with several transitive dependencies.
3. **Helvetica-only fonts.** Although `Font.register()` works on Workers,
   the template has never used it — all text is rendered in the built-in
   Helvetica.

## Considered options

| Option                               | Tagged PDF                       | Workers compat     | Dependencies  | React model               |
| ------------------------------------ | -------------------------------- | ------------------ | ------------- | ------------------------- |
| **pdfnative** (selected)             | ✅ Full `/StructTreeRoot`, PDF/A | ✅ Explicit        | 0             | ✅ pdfnative-react v0.2.0 |
| @imprint-pdf/react + @imprint-pdf/ua | ✅ Via plugin                    | ✅ (WASM)          | Medium (WASM) | ✅ React + Tailwind       |
| Keep @react-pdf, fix template        | ❌ No tagged PDF                 | ✅ Proven          | High          | ✅ Familiar               |
| PDFKit direct (unwrapped)            | ✅ `tagged: true`                | ✅ `nodejs_compat` | 6 deps        | ❌ Manual layout          |

pdfnative was chosen because it alone scores on all four axes. Its
zero-dependency pure-TypeScript core eliminates the bundle concern
entirely, and its React renderer mirrors the @react-pdf component model
(`<Document>`, `<Text>`, `<Image>`, `<Link>`, `usePdf`) — making the
migration path shorter than any other tagged-PDF option.

## Decision

- Install `pdfnative` and `pdfnative-react` as replacements for
  `@react-pdf/renderer`.
- Rewrite `apps/web/src/server/resume-pdf.tsx` from @react-pdf components
  to pdfnative-react components, maintaining the same visual layout
  (A4, single-column, section headers, contact row, experience bullets,
  project entries, skills list).
- Enable `tagged: true` on the `<Document>` to emit PDF/A-2b with full
  structure tree — this is the ATS-safe output.
- Register custom fonts (Geist or similar) via `fontEntries` on the
  render options or `<Document>` prop, replacing the built-in Helvetica.
- Use `renderToBytes()` (returns `Uint8Array`) in place of
  `renderToBuffer()` (returns Node.js `Buffer`). The R2 upload path
  already accepts `Uint8Array` via the S3-compatible binding.
- Remove `@react-pdf/renderer` from the workspace catalog and
  `apps/web/package.json` dependencies.
- Keep the existing data flow unchanged: route handler fetches portfolio
  data → calls `generateResume()` → uploads to R2 → creates DB record.
  Only the rendering engine changes.

### Layout translation notes

- **Contact row** — currently `flexDirection: "row"` with separator
  dots. pdfnative-react has no flexbox; render as a single
  `<Text>` with " · " separator between items.
- **Section grouping** — currently `<View wrap={false}>` to prevent
  orphaned sections. pdfnative-react has no `<View>`; rely on the
  block-level `<Heading>` + `<Paragraph>` / `<List>` grouping, which
  pdfnative handles natively (blocks are atomic units).
- **Bullet extraction** — the current `extractBullets()` / `stripHtml()`
  helpers stay; pdfnative's `<List>` component accepts `items: string[]`
  for bullet content.

## Consequences

- All future PDFs (cover letters, certificates) start with tagged output
- Workers bundle loses @react-pdf/renderer weight (~MBs with deps)
- Core dependency is very young (pdfnative v1.4.0, April 2026;
  pdfnative-react v0.2.0, June 2026) — supply-chain and API-stability
  risk is higher than the incumbent
- The pdfnative-react layout model (block flow, no flexbox) requires a
  one-time restructuring of the template; not a drop-in replacement
- Node.js ≥ 22 requirement already met by the Workers `nodejs_compat`
  compatibility date
