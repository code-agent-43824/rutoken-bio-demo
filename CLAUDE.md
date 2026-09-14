# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

The line above is an import: it pulls the shared rule set into context at session
start. Nothing from it is restated here — this file holds only the map of the code
(§0). Project documents live in `docs/`; read `docs/STATUS.md` for the current state.

## Commands

```bash
node test.js                  # the whole check suite — no dependencies, no package.json
python3 -m http.server 8000   # serve locally, then open http://localhost:8000
```

There is no build, no linter and no package manager. `test.js` is a single IIFE that
runs end to end, so there is no "single test" to run — to narrow a run, comment out
assertion blocks temporarily and restore them before committing.

Nothing here exercises real biometrics. That needs a browser with the Rutoken plugin
installed and a Rutoken Bio token plugged in; `test.js` drives a fake plugin object,
which is a claim about logic only (§4).

## Map of the code

Four files in the repository root — `index.html`, `style.css`, `script.js`, `test.js` —
plus the documents. The plugin arrives as an external `<script>` from Aktiv's demo
portal (`aktivco.github.io/rutoken-plugin-demo/rutoken-plugin.js`) and exposes
`window.rutoken`; the project has no dependencies of its own.

`script.js` is one IIFE under `'use strict'`. The flow is `loadPlugin()` →
`refreshDevices()` → `login()` → `refreshKeys()` / `createKeyPair()` → `signData()`,
plus the three biometric buttons (`loginBio`, `logoutBio`, `stopLoginBio`) and the log.

### What `test.js` constrains

`test.js` uses no jsdom. It builds its own `global.document`, `global.window` and a fake
`plugin`, then `require('./script.js')`. So `script.js` may only use what the fake DOM
implements:

- element access through `document.getElementById` and `document.createElement` only —
  no `querySelector`, no `dataset`, no `remove()`;
- `innerHTML` may only be assigned `''`; `FakeElement` asserts on any other value;
- timers and the clipboard go through `window.setTimeout` / `window.clearTimeout` /
  `window.navigator.clipboard`, never the bare globals;
- one handler per element per event type — the fake `addEventListener` overwrites.

A new element `id` has to be added to `index.html` **and** to the `ids` array in
`test.js`, or `getElementById` returns `undefined` and the run dies at startup.

The tests assert on markup (the default PIN on `#pinInput`, the number of
`.step-number` cards), on exact UI strings and on the key icons. The values live in
`index.html` and `script.js`; `test.js` is where they are pinned. Change the wording
and the assertion in the same commit (§10).

### Invariants

**Biometric operation order.** Every protected operation runs
`isLoginBioRequired → loginBio(deviceId, {objectId: keyId, timeout}) → operation → logoutBio`.
`authorizeBioObject()` implements it for labelling and deletion; `signData()` spells the
same sequence out. Hook new operations on bio keys into `authorizeBioObject()` rather
than writing the chain again. `performBioLogin()` wraps the callback-style
`plugin.loginBio` in a promise and guards against a second callback.

**Bio preflight.** `preflightBioKey()` reads `TOKEN_INFO_BIO_ATTEMPTS_INFO`. Zero
counters block generation; undefined or non-numeric ones do not — readiness is confirmed
by a real `loginBio` in `confirmBioReady()`. See `docs/JOURNAL.md` for why.

**Biometric state** lives in three module variables: `bioSessionActive`,
`bioReadyConfirmed` and `knownKeyProtection` (the remembered protection type of a key,
needed because `isLoginBioRequired` answers `false` while a bio session is open).
Switching devices resets the first two.

**Nothing secret reaches the log.** `log()` writes user-facing lines, `debug()` writes the
trace (hidden until `#consoleSection` carries the class `detailed`). Everything in `debug`
goes through `safeJson()`, which masks the keys `pin|password|payload|data` and truncates
long strings. Pass lengths (`pinLength`, `dataLength`) to `trace()`, never values; a test
asserts the copied console holds neither the PIN nor the signed data.

**Race guards.** `deviceRefreshGeneration` and `keyRefreshGeneration` are incremented at
the start of each refresh, and a result reaches the DOM only while its generation is still
current. Any new asynchronous render of those lists needs the same check.

**Plugin error codes** are matched on the message prefix via `hasErrorCode(error, 19)`:
19 means a login is required, 93 that the login already happened.

### Style

`script.js` is written ES5-style: `function` expressions rather than arrows, explicit
promise chains rather than `async/await`. Match it. Wrap plugin calls in
`trace(operation, details, action, summarizeResult)` for uniform `*.start` / `*.success` /
`*.error` records with timings. Colours and spacing are CSS Custom Properties on `:root`
in `style.css` (`--rt-red`, `--rt-teal`, …); add new ones there, not inside rules.

## Version discipline

`BUILD_ID` in `script.js` and the `?v=` query on `<script src="script.js?v=…">` in
`index.html` must match. GitHub Pages caches aggressively, so every change to `script.js`
raises both — otherwise visitors keep the old file.

## Deployment

GitHub Pages publishes the root of `main` as is: a push to the trunk *is* a production
deploy, and every file in the root ships. There is no build step and no staging.
After deploying, open https://code-agent-43824.github.io/rutoken-bio-demo/ and confirm
the served `script.js` carries the expected `?v=` (§6).

## Settled decisions

- **The key list refreshes only on the "Обновить" button.** Neither a successful PIN login
  nor key creation calls `refreshKeys()`; they show a hint through `showKeyListHint()`,
  and `test.js` asserts both. The reason is not recorded anywhere: it is *not* about
  speed — the owner confirmed keys read fine (2026-09-14). Keep the behaviour and the
  assertions as they are; changing them is his call, not a cleanup.
- **A default PIN is hard-coded on `#pinInput` in `index.html`.** The owner keeps it there
  for convenience (2026-09-14): the page is usable at a stand without typing. Do not
  change or remove the value; `test.js` asserts it stays.
- **The plugin loader is fetched from Aktiv's demo portal, unpinned and not vendored.**
  The owner decided against any pinning (2026-09-14): the demo depends on a custom plugin
  and browser extension that may change any day, and the page has to keep working with
  whatever version is current. Subresource Integrity or a vendored copy would break on
  the next upstream change, so §7's SHA-256 pinning does not apply here. Do not add
  `integrity=`, and do not reopen this.
- **UI text, project documents and log lines are Russian; code and commits are English** (§10).
- **Commits go straight to `main`.** The harness starts cloud sessions on a branch
  (`claude/…`) and forbids pushing to the trunk unless the owner says otherwise; he said
  otherwise on 2026-09-14. Work on the assigned branch if the harness insists, but it is
  not done until `main` carries it — merge fast-forward and push.
- **No `docs/decisions/` yet** — created when first needed (§2).

## What the owner reviews

The biometric paths can only be judged on real hardware: the owner opens the published
page with a Rutoken Bio token plugged in. Pause after a stage that touches biometrics
instead of starting the next one (§13).
