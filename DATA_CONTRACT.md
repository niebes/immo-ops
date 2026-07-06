# Data Contract

This document defines which files belong to the **system** (auto-updatable) and which belong to the **user** (never touched by updates). It is kept in sync with `.gitignore`: everything in the User Layer is gitignored (personal data never leaves the machine); everything in the System Layer is committed.

## User Layer (NEVER auto-updated)

These files contain your personal data, customizations, and work product. Updates will NEVER modify them.

| Path                       | Purpose                                                  |
|----------------------------|----------------------------------------------------------|
| `config/profile.yml`       | Your identity, search criteria, applicants, swap offer   |
| `config/cookies-*.json`    | Saved portal session cookies                             |
| `modes/_profile.md`        | Your scoring weight overrides and preferences            |
| `portals.yml`              | Your customized portal list                              |
| `data/listings.md`         | Your listing tracker                                     |
| `data/pipeline.md`         | Your URL inbox                                           |
| `data/scan-history.tsv`    | Your scan dedup history                                  |
| `data/scan-failures.json`  | Portals that failed/blocked during your scans            |
| `data/viewings.md`         | Your viewing schedule                                    |
| `data/documents.md`        | Your document submission tracker                         |
| `data/*.bak*`, `data/*.prerescan` | Backups/snapshots of the data files above (gitignored — same personal data) |
| `reports/*`                | Your evaluation reports                                  |
| `research/*`               | Your research reports                                    |
| `output/*`                 | Your generated exports (Selbstauskunft, …)               |
| `correspondence/*`         | Your landlord correspondence logs (except the committed `correspondence/README.md`, which is system layer) |
| `applications/*`           | Your application packages                                |
| `documents/*`              | Your personal documents (SCHUFA, IDs, payslips, …; only the `.gitkeep` placeholder is committed) |
| `inbox/*`                  | Your dropped-in URLs/files awaiting processing           |
| `batch/tracker-additions/*`| Pending tracker rows written by evaluations              |
| `batch/logs/*`             | Batch/scan run logs                                      |

## System Layer (safe to auto-update)

These files contain system logic, scripts, templates, and instructions that improve with each release.

| Path                        | Purpose                                                  |
|-----------------------------|----------------------------------------------------------|
| `modes/*` (except `_profile.md`) | Mode instructions: scoring, evaluate, scan, pipeline, contact, tracker, research, … |
| `CLAUDE.md`                 | Agent instructions                                       |
| `README.md`                 | Setup and usage documentation                            |
| `docs/*`                    | Additional documentation (e.g. CiC-over-CDP scan)        |
| `scripts/*`                 | Utility scripts, incl. `scripts/lib/`, `scripts/portals/` extractors, and `scripts/immo-chrome.sh` |
| `templates/*`               | Base templates, incl. `templates/states.yml` (canonical listing statuses) and `templates/portals.example.yml` |
| `config/profile.example.yml`| Profile template                                         |
| `.claude/skills/*`          | Skill definitions                                        |
| `.claude/agents/*`          | Agent definitions (e.g. immo-evaluator)                  |
| `.claude/agent-memory/immo-evaluator/*` | Accumulated portal-page knowledge (selectors, consent flows, quirks). System layer and **committed**: it is mergeable operational knowledge, not personal data. Unlike other system files it is written locally by the evaluator agent; upgrades should merge, not blindly replace. |
| `DATA_CONTRACT.md`          | This file                                                |

Not covered by the contract: `tmp/` (scratch working files, gitignored, may be deleted at any time), `node_modules/`, and `.claude/settings.local.json` (local machine settings, gitignored).

## The Rule

**If a file is in the User Layer, no update process may read, modify, or delete it.**

**If a file is in the System Layer, it can be safely replaced with the latest version from the upstream repo** (exception: `.claude/agent-memory/` is merged, see above).
