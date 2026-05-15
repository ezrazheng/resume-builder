# Resume Builder

Single-page resume builder with live preview, import helpers, and PDF/DOCX export.

## Project layout

- `index.html` — markup and CDN script tags
- `css/styles.css` — all app styles (themes, layout, components)
- `js/*.js` — application logic (see below)

## Script layout

The runtime JavaScript is split by responsibility to keep edits focused:

- `js/app-core.js` — state, shared helpers, modal logic, editor handlers
- `js/import-parser.js` — import parsing and normalization (`runImport`)
- `js/render-export.js` — preview rendering + export (`exportPDF`, `exportDOCX`, `fitPreview`)
- `js/app-init.js` — theme handling + startup (`initApp`)

`index.html` loads those four files in the order above (after the CDN libraries).

`js/app.js` is a short stub that points at the split files; it is not loaded at runtime.

## Export & CDN dependencies

- **PDF** — opens a print-friendly HTML window and uses the browser print dialog (save as PDF). No jsPDF bundle is required.
- **Word (.docx)** — `docx` + `file-saver` (loaded from CDN in `index.html`).
- **Import .docx** — `mammoth` (CDN).

## Editing notes

- Keep behavior changes small and scoped to one script when possible.
- Prefer helper extraction over inline one-liners for readability.
- If adding new features, place code in the matching responsibility file first.
