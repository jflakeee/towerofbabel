# Development tool installation inventory — 2026-11-20

This is a **staged development-tool integration**, not a gameplay feature, live Claude plugin activation, or production release. Six official upstream repositories are pinned as Git submodules at `external/`. The production PWA has no new runtime imports, no npm dependencies, no changed save schema, and no new hooks enabled.

## Pinned upstreams (verified GitHub commits)

| Tool | Repository submodule | Pin | Purpose |
|---|---|---|---|
| Awesome GameDev Agent Skills | `external/awesome-gamedev-agent-skills` | `c6ca6c41c839b68319ffc08430b99ab768debc32` | Skill router and 79 specialist skills |
| Claude Code Game Studios | `external/Claude-Code-Game-Studios` | `abc0de79d6ceb0b5d7aa693945849b3937afbe6a` | Studio process/template |
| claude-gamedev-kit | `external/claude-gamedev-kit` | `86b5b6ddd33a542ef4ca1cc2de067feb82763cc2` | Plugin, agents, cycle, dashboard |
| dream-loop | `external/dream-loop` | `9bddb901f7d071cfefdd21e264267c757177a9df` | Image-guided visual refinement skill |
| plinkfx | `external/plinkfx` | `7e5f6a477037679a29df9c5141e9853b1267e7d8` | Code-generated game audio |
| pixelfx | `external/pixelfx` | `5294518ce7c72e48b6100a744596e0acf57f2826` | Code-generated pixel VFX |

To populate full upstream source after checking out the work branch:

```bash
git checkout chore/ccgs-integration-20261111
git submodule update --init --recursive
```

**Activation is separate from checkout**: cloning a skill repo or copying a SKILL.md does not install an active Claude Code marketplace plugin; adding source packages does not automatically connect sound/VFX to the game. No system-wide Claude Code marketplace installations or npm installs have been executed by this GitHub connector.

### Copied project-local files

- Existing partial CCGS files remain in `.claude/`; they are **not** a complete verified upstream installation.
- `.claude/skills/gamedev-router/SKILL.md` and eight targeted Awesome skill SKILL.md files provide discovery; the full skill references and examples are in their pinned submodule. Do not assume every copied reference resolves without activating the full skill bundle.
- `.claude/skills/dream-loop/` contains its SKILL.md and both mode references.
- `.claude/skills/plinkfx/SKILL.md` and `.claude/skills/pixelfx/SKILL.md` contain authoring guidance, not the full runtime libraries.
- `.claude/vendor/claude-gamedev-kit/` contains 41 text files (plugin metadata, agents, hooks, skill scripts, templates, web engine references), **inactive by default**. No hooks, workers or dashboard started.
- Licenses are retained in `.claude/vendor-licenses/` and in each full upstream submodule.

### Manual opt-in activation in an actual Claude Code environment

Only after reviewing hooks and permission scope:

```bash
claude plugin marketplace add gamedev-skills/awesome-gamedev-agent-skills
claude plugin install router@awesome-gamedev-agent-skills
claude plugin install web-engines@awesome-gamedev-agent-skills

claude plugin marketplace add dudwns0921/claude-gamedev-kit
claude plugin install gamedev-kit@claude-gamedev-kit --scope project
```

Use `external/Claude-Code-Game-Studios` as a source for incremental review and migration, **not** a template overlay on this existing game. Use Dream Loop's project-local skill, or its original `npx skills add achimala/dream-loop` command. To integrate VFX/audio into a future build, assess `npm i plinkfx` and `npm i github:patch-gg/pixelfx` in an isolated change, or export effects to static files: Tower of Babel currently uses browser-native ES modules and has no bare-import bundler. Keep game audio preferences, PWA/offline caching, performance and settings compatible.

### Verification and release gates

- GitHub registered six full submodule gitlink entries and `.gitmodules`.
- The `external-tool-submodules` job in the dedicated no-deploy CI checks actual checkout and required entry files.
- Existing `npm run check`, `npm test`, `npm run test:soak` and `npm run build` remain required for the original game.
- No assertion about Claude Code runtime recognition, active plugins, native audio/VFX playback or mobile visual parity until independently validated.
- Leave `main` and public deployment untouched; PR #23 stays draft.

## Security / collision notes

Third-party scripts, hooks and agent instructions are untrusted until reviewed. The kit's names overlap existing CCGS commands (e.g. `start`) and would initialize templates, dashboard workers and hooks; keep it unactivated. Never let an upstream installer overwrite `CLAUDE.md`, `project.yaml`, `package.json`, `README.md`, tests, game source or Pages workflow without an explicit scoped review. Never merge/update submodule versions automatically.
