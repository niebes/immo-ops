# Data Contract

This document defines which files belong to the **system** (auto-updatable) and which belong to the **user** (never touched by updates).

## User Layer (NEVER auto-updated)

These files contain your personal data, customizations, and work product. Updates will NEVER modify them.

| File                    | Purpose                                       |
|-------------------------|-----------------------------------------------|
| `config/profile.yml`    | Your identity, search criteria, documents     |
| `modes/_profile.md`     | Your scoring weight overrides and preferences |
| `portals.yml`           | Your customized portal list                   |
| `data/listings.md`      | Your listing tracker                          |
| `data/pipeline.md`      | Your URL inbox                                |
| `data/scan-history.tsv` | Your scan history                             |
| `data/viewings.md`      | Your viewing schedule                         |
| `data/documents.md`     | Your document submission tracker              |
| `reports/*`             | Your evaluation reports                       |
| `research/*`            | Your research reports                         |
| `output/*`              | Your generated exports                        |

## System Layer (safe to auto-update)

These files contain system logic, scripts, templates, and instructions that improve with each release.

| File                      | Purpose                                             |
|---------------------------|-----------------------------------------------------|
| `modes/_shared.md`        | Scoring system, global rules, tools, scam detection |
| `modes/evaluate.md`       | Evaluation mode instructions                        |
| `modes/compare.md`        | Comparison mode instructions                        |
| `modes/viewing.md`        | Viewing management + checklist instructions         |
| `modes/contact.md`        | Contact/message drafting instructions               |
| `modes/tracker.md`        | Tracker mode instructions                           |
| `modes/pipeline.md`       | Pipeline processing instructions                    |
| `modes/scan.md`           | Portal scanner instructions                         |
| `modes/research.md`       | Deep research instructions                          |
| `modes/auto-pipeline.md`  | Auto-pipeline instructions                          |
| `modes/batch.md`          | Batch processing instructions                       |
| `modes/market.md`         | Market analysis instructions                        |
| `modes/scam-check.md`     | Standalone scam detection instructions              |
| `modes/selbstauskunft.md` | Selbstauskunft generator instructions               |
| `modes/documents.md`      | Document tracker instructions                       |
| `CLAUDE.md`               | Agent instructions                                  |
| `scripts/*.mjs`           | Utility scripts                                     |
| `templates/*`             | Base templates                                      |
| `.claude/skills/*`        | Skill definitions                                   |
| `DATA_CONTRACT.md`        | This file                                           |

## The Rule

**If a file is in the User Layer, no update process may read, modify, or delete it.**

**If a file is in the System Layer, it can be safely replaced with the latest version from the upstream repo.**
