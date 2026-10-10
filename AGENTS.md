# AGENTS.md — rutoken-bio-demo

Canonical development rules: [coding-rules](https://scm.aktivco.ru/prototypes/coding-rules)
(raw: https://scm.aktivco.ru/prototypes/coding-rules/-/raw/main/AGENTS.md).
This file does NOT duplicate the canon (goose injects every subdirectory's
AGENTS.md into each session's context) — project-specific material only.
The map of the code lives in `CLAUDE.md`.

## What this is

Static web demo page (vanilla HTML/CSS/JS) for the Rutoken Bio USB token:
biometric enrollment simulation, device status, rutoken.ru-style light theme
(`--rt-*` palette variables in `style.css`).

## Structure

- `index.html` + `style.css` + `script.js` — the page; `test.js` — tests.
- Project documents: `README.md`, `PLAN.md`, `HANDOFF.md`, `docs/`.

## Git

Remote: GitHub `code-agent-43824/rutoken-bio-demo`. Push directly to `main`.
