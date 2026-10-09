# Agent guide

lazymage is a React 19 library that lazy loads images and components. The source is TypeScript in `src/`. The effect styles are in `src/effects/`.

## Commands

Use `bun` as the package manager.

- `bun run check`: lint (Oxlint, type-aware) and format check (Oxfmt) through Ultracite.
- `bun run fix`: apply the safe lint and format fixes.
- `bun run typecheck`: run `tsc --noEmit`.
- `bun run test`: run Vitest (happy-dom, Testing Library).
- `bun run build`: build ESM, CJS, and types into `dist/` with Rslib.
- `bun run lint:package`: run publint and Are the Types Wrong on the package.
- `bun run docs:dev` and `bun run docs:build`: run the Blume docs site. The Blume project is in `docs/` (content in `docs/content/`, output in `docs/dist/`).

Run `check`, `typecheck`, and `test` before you finish a change.

## Code standards

Ultracite sets the rules (`oxlint.config.ts`, `oxfmt.config.ts`). Do not add rule overrides without a reason.

- Use explicit types where they help. Use `unknown`, not `any`. Prefer type narrowing to type assertions.
- Use function components and hooks. Call hooks at the top level with correct dependencies. Do not define components inside components.
- Use React 19 APIs: `ref` as a prop and ref callback cleanup, not `forwardRef`.
- Use early returns. Do not nest ternaries. Keep functions small.
- Always `await` promises. Do not leave `console.log` or `debugger` in the source.
- Do not add runtime dependencies. `react` and `react-dom` are peer dependencies.
- Keep tests next to the source as `*.test.ts(x)`. Do not commit `.only` or `.skip`.

## Changelogs

Tegami manages versions and releases. For a change that affects users, add `.tegami/YYYY-MM-DD-<hash>.md` with `packages:` frontmatter (`lazymage: patch|minor|major`) and at least one `##` heading. Do not edit `CHANGELOG.md` or `.tegami/publish-lock.yaml`. See `CONTRIBUTING.md`.
