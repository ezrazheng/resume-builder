# Resume Builder

Single-page resume builder with live preview, import helpers, and PDF/DOCX export.

## Script Layout

The runtime JavaScript is split by responsibility to keep edits focused:

- `js/app-core.js` — state, shared helpers, modal logic, editor handlers
- `js/import-parser.js` — import parsing and normalization (`runImport`)
- `js/render-export.js` — preview rendering + PDF/DOCX export
- `js/app-init.js` — theme handling + startup flow

`index.html` loads these files in the order above.

## Editing Notes

- Keep behavior changes small and scoped to one script when possible.
- Prefer helper extraction over inline one-liners for readability.
- If adding new features, place code in the matching responsibility file first.
