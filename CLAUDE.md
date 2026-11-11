# Tower of Babel — Claude Code working instructions

This is an **existing** mobile-first JavaScript / Canvas 2D PWA game, not a blank scaffold.

- Preserve existing game behavior, save formats, Web Locks single-writer protection, mobile touch input and PWA caching.
- Do not overwrite `package.json`, `README.md`, `.github/workflows/pages.yml`, source or tests with the upstream template.
- Use `npm run check && npm test && npm run test:soak && npm run build` as baseline and regression gates.
- Keep `main` and public GitHub Pages deployment unchanged until explicit approval after verified tests.
- `project.yaml` stores project configuration; `modes.rigor: standard`.
- Imported CCGS skills under `.claude/skills/` are **partial** and may reference other upstream files not yet imported. Do not claim they work until their dependency closure is installed and Claude Code verifies them.
- Before running any imported shell script, review its content and required dependencies.
- Record installed, tested, committed, deployed, and browser-verified statuses separately.
