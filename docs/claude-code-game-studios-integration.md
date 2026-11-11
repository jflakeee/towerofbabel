# Claude Code Game Studios — Tower of Babel integration

Status: **staged instructions only; framework not yet installed or executed**.

## Baseline

- Existing game: mobile-first vanilla JS PWA; keep `src/`, `tests/`, `index.html`, `styles.css`, `sw.js`, `package.json` and `.github/workflows/pages.yml` intact.
- Base branch: `main`. Integration branch: `chore/ccgs-integration-20261111`.
- Existing commands: `npm run check`, `npm test`, `npm run test:soak`, `npm run build`.
- Upstream: https://github.com/Donchitos/Claude-Code-Game-Studios (MIT). Review upstream LICENSE and scripts before execution.

## Installation (developer workstation / Claude Code environment)

1. `git checkout chore/ccgs-integration-20261111` and ensure `git status --short` is empty.
2. `npm run check && npm test && npm run test:soak && npm run build`; record baseline results.
3. Clone upstream **outside this repository**, for example `git clone https://github.com/Donchitos/Claude-Code-Game-Studios.git ../Claude-Code-Game-Studios`. Record `git -C ../Claude-Code-Game-Studios rev-parse HEAD` and inspect its LICENSE, hooks, permissions, shell scripts and configuration.
4. Review upstream `.claude/`, `CLAUDE.md`, `project.yaml` and any referenced supporting files. Copy **only reviewed, required** framework files into this branch; never overwrite an existing file. Do not copy upstream's game prototype, package.json, CI workflows, README, source, tests, or distribution assets over this project.
5. Configure `project.yaml` for existing work, `modes.rigor: standard` (confirm syntax against the pinned upstream version). Preserve existing app and deployment architecture.
6. Open Claude Code from the repository **root**, run `/start`, choose **existing project**, then `/project-stage-detect` and `/project-settings`. Verify the actual slash commands, hooks and settings in Claude Code. Do not claim these commands executed merely because their files exist.
7. Re-run all four baseline commands; compare outputs and check `git diff --check`, `git diff --stat main...HEAD`. Test on Chromium and mobile viewport before approval.
8. Commit reviewed integration files to this branch, open a PR, require CI success and review before merging. GitHub Pages deploys only from `main`; do not change Pages settings or deploy the integration branch automatically.

## Acceptance criteria

- Framework commands load in Claude Code without unsafe permission escalation.
- Existing saves (including Web Locks single-writer protections), combat, PWA offline cache, mobile joystick and transaction safety behave unchanged.
- No existing game files or history overwritten; no `main` changes before approval.
- Report separately: files prepared, installed, CLI verified, tests passed, committed, pushed, deployed, browser verified.

## Verification record (2026-11-11)

- GitHub repository metadata and existing README, package.json, Pages workflow inspected remotely.
- Dedicated integration branch created.
- Local Git clone of GitHub blocked by DNS resolution in execution environment.
- Upstream framework files **not copied**. Claude Code CLI **not executed**. Tests **not executed**. Deployment **not attempted**.
