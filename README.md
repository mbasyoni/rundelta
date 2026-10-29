# RunDelta

**Compare experiment-settings snapshots, with an exact record of what changed.**

RunDelta is a small, independent browser-local utility. It compares two UTF-8 CSV files with the fixed header `parameter,value,unit,notes`, identifies added/removed/changed settings and unit mismatches, and exports a reviewable JSON or spreadsheet-friendly CSV report. Original files can be downloaded byte-for-byte.

## Run

Serve `dist/` with any static HTTP server, for example `python3 -m http.server 8080 --directory dist`, then open `http://localhost:8080`. No build or dependency installation is required. Modern browser support for modules, TextDecoder, Web Crypto and Blob downloads is required; localhost or HTTPS is necessary for Web Crypto. No backend, uploads, telemetry, accounts or external resources are used.

Select Before and After CSVs, then Compare. Use the synthetic example to explore without supplying research data. Changing either input clears the previous comparison. Invalid schemas and duplicate identifiers block comparison.

## Exact semantics

- Parameter keys, values, units and notes are case-sensitive, exact strings. Whitespace is preserved. Parameter names must be unique and nonblank.
- Header order is fixed; no implicit mapping, trimming or numerical interpretation.
- `1`, `1.0`, `01`, `NaN`, and `1e-400` are text, not numeric values.
- Unit differences are flagged, not converted. The app does not infer scientific equivalence or validate an experiment.
- Empty values, units and notes are permitted; presence is distinguished from a missing parameter.
- UTF-8 with optional initial BOM, RFC-style quoted fields, embedded newlines, CR/LF/CRLF. 250,000 bytes, 1,000 data rows, 10,000 characters per field. Empty files/header-only files, malformed records, NULs and invalid UTF-8 are rejected.
- Reports contain filenames, byte lengths, source SHA-256 fingerprints and exact field-level differences. They have no generated timestamp; identical input bytes/names produce deterministic reports. Entries are sorted by JavaScript code-unit string ordering.
- JSON preserves exact strings. CSV prefixes formula-like cells with an apostrophe. Spreadsheet import behavior varies: use JSON/originals for exact archival data and review untrusted files before opening them.
- Original byte downloads have stable safe filenames; no source content is modified.

## Test

`npm run check` runs syntax checks and Node's built-in tests (Node 20+). No dependencies.

## Independence and provenance

Created from scratch on 29 October 2026 with OpenAI coding assistance for a narrow hackathon prototype. Only synthetic examples were used. No commercial source, private research code, proprietary models or customer datasets were read or reused. It is a separate utility, not a reduced distribution of a commercial product. No claims of experimental validation, industrial certification or universal operating-system compatibility are made.

MIT licensed. The license covers only this standalone utility, not any separate commercial product, private research code, or dataset. Competition submission and acceptance are separate from source publication.
