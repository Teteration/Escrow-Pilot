# Changelog

## 1.1.0 — UI refinement and project-local frontend guidance

- Consolidated the dashboard styles into a navy/emerald visual system with
  responsive workspace, project cards, clearer forms and empty states.
- Added address search and status filters; summary statistics remain factory-wide.
- Added inline creation/voting transaction lifecycle notices with Etherscan links,
  read-loading/error feedback, and removed generic vote-error popup alerts.
- Improved keyboard skip navigation, table caption/column scopes, form error
  announcements and Oracle input help associations. Preserved Persian/English
  localization and reduced-motion support.
- Added three reviewed, version-pinned project-local frontend/design/accessibility
  skills with provenance, license notices and installation boundaries; no upstream
  automation scripts or new runtime libraries were installed.
- Updated interface documentation and continuation guidance.

Validation: frontend lint has no errors or warnings; production build passes;
translation coverage checks pass. The existing bundle-size warning remains.
Full browser, viewport, real-wallet and assistive-technology acceptance is pending.
No contract, ABI, deployment-address, token integration or mainnet readiness changes.

The previous repository release tag is `V1.0.0`. This release uses `V1.1.0`
to preserve that tag naming convention. Backend package versioning is unchanged.