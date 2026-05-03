# Contributing

## Release checklist

1. `npm run typecheck && npm run test`
2. `npm run rebuild`
3. **Dist freshness gate:** `git diff --exit-code -- dist/` — must be clean. If not, dist was stale; the rebuild updated it. Stage and amend.
4. Update `CHANGELOG.md` (move Unreleased → new version).
5. Bump version in `package.json`.
6. `git add dist/ CHANGELOG.md package.json`
7. `git commit -m "chore(release): vX.Y.Z"`
8. `git tag vX.Y.Z`
9. `git push --tags origin main`
10. Update consumers (`#vX.Y.Z` suffix in their package.json) with `npm cache clean --force && rm -rf node_modules && npm install`.

## Adding a new module

1. Create `src/<module>/{index.ts, <module>.ts, <module>.spec.ts}`
2. Add export entry in `package.json` exports map (with `types`, `require`, `default`)
3. Add re-export in `src/index.ts`
4. Document in `README.md` table
5. Write tests first (TDD); coverage ≥ 80%

## devGuard policy

Only modules that mutate **externally-persistent OS state** that affects
boot of the system outside the app should use `devGuard`. Today: `auto-launch`
(writes to `HKCU\...\Run`). Future: shortcuts in Start Menu, protocol handlers,
login items, registry writes outside electron-store.

Modules that write only to `app.getPath('userData')` (electron-store, log
files) or that create UI/process objects (tray, windows, dialogs) run
identically in dev and packaged. Do NOT add devGuard to these.
