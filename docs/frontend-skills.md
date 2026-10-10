# Frontend skills and initial review

## Installed project guidance

Three project-local skills live under `.cline/skills/`: `frontend-design`,
`senior-frontend`, and `fixing-accessibility`. Open Cline's Rules/Skills menu
to check detection and enabled state. Automatic detection has not been verified
through the extension UI in this environment. A global skill with the same name
can override the project copy; check for duplicates when changing computers.

Source revision and installed-file SHA-256 hashes are in
`../.cline/skills-source.json`. These are reviewed documentation subsets from
`sickn33/agentic-awesome-skills`, not a runtime dependency or installer.
Original guidance is preserved with an appended TrustDApp boundary note.
Catalog and per-skill license notices are retained. The accessibility license
was additionally retrieved from its credited upstream repository.

Scripts were deliberately excluded. Scaffolder/generator/analyzer commands in
the senior-frontend guide are not available and must not be executed blindly.
Next.js, Tailwind, TypeScript, Storybook and test-library examples do not justify
adding those tools to this React/Vite JavaScript project.

Usage example: ask the agent to read the three installed skills and review a
specific screen. First request findings and an implementation plan, then approve
changes. Keep framework, localization, contract and security constraints explicit.
Skills are guidance, not proof of usability or permission to sign transactions.

## Design direction

Preserve a restrained, trustworthy financial dashboard, dark theme, readable
content and familiar wallet/transaction controls. Clarity takes priority over
decorative novelty. Keep English LTR and Persian RTL equally usable, and keep
Oracle availability warnings visible. Do not alter voting or token separation.

## Initial source-based findings

This is a code review, not a browser, screen-reader or WCAG certification.
No UI or application behavior was changed during skill installation.

### Form feedback and errors — high priority

In `frontend/src/App.jsx`, the `formError` block renders a styled `div` without
`role="alert"`, field association or `aria-invalid`. Oracle help paragraphs are
not associated with URL/path inputs. Add stable IDs, relevant `aria-describedby`
and invalid states, and make critical feedback discoverable without relying on
color. Preserve both translations. Only associate a field error with the fields
that actually failed validation.

### Transaction lifecycle — high priority

`handleAction` uses `alert(...)` with a generic already-voted/unauthorized message
for all failures. A single shared `loading` flag provides little distinction
between wallet approval, submitted transaction, mining, and read refresh. Use
inline, accessible per-action feedback with rejection/network/revert distinctions,
transaction links and explicit progress. Never announce success before receipt.

### Keyboard focus and table semantics — verify and improve

Styles do not define a consistent `:focus-visible` treatment across buttons,
links, selects and summaries; browser defaults may exist, so actual focus
visibility needs checking rather than assuming total keyboard failure.
The project table uses `th` without explicit `scope` and has no caption. Prefer
clear column associations and a translated caption. Verify responsive cards with
assistive technology; generated `data-label` text alone is not an accessibility
test. Add a useful main-content target/skip link if needed.

### Read performance and resilient UI — medium priority

`fetchEscrows` awaits multiple reads per contract and processes contracts
sequentially. Review bounded concurrency and per-project read errors to reduce
latency without overwhelming the RPC. Separate empty, loading, stale and failed
states. Preserve existing session generation protections against stale results.

### Visual acceptance — pending

Check widths 360, 390, 768, 1024 and 1440 pixels in both languages, long API URLs,
transaction hashes, all voting badges and error states. Measure contrast rather
than inferring it from a dark theme. Check zoom, wrapping, touch targets, tab
order and reduced motion. Avoid layering more CSS overrides without consolidating
the existing repeated selectors after acceptance criteria are agreed.

## Proposed next change

Start with accessible form feedback and wallet/transaction state presentation,
then perform browser acceptance before broader visual refactoring. Extract
components incrementally; no framework migration is needed. Run existing lint
and build, record checks actually performed, and request approval before commits,
pushes, paid network operations or new dependencies.

## First implementation pass

Implemented a consolidated navy/emerald stylesheet, responsive workspace/cards, address search, status filtering, explicit read feedback, inline creation/vote transaction progress and explorer links, improved form error announcement/help association, skip navigation and column scopes. Removed vote-error alerts. No contract, deployment or runtime dependency changes. The existing global focus-visible rule was present in index.css; the initial App.css-only review did not include it. This pass strengthens and unifies that treatment rather than claiming the old app had none. Lint/build and translation coverage checks passed. Headless Chromium produced no usable DOM; responsive overflow, actual wallet flows, keyboard/screen-reader behavior and complete contrast acceptance still need browser validation.
