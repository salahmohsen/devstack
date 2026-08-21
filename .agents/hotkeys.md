# Keyboard shortcuts

Use **TanStack Hotkeys** for every shortcut, hotkey, chord, or key sequence. Do not add `window`/`document` `keydown` matchers.

- Commands (what runs) stay in `apps/web/src/shared/lib/commands/catalog.ts`.
- Bindings (what the user presses) stay in `default-bindings.ts` plus user overrides. Never put keys on the command itself.
- Register through `useHotkeys` / `useHotkeySequences` (already hosted by `CommandHotkeys`). Add a catalog entry + default binding; register a handler only when the action is local (tabs, a panel).
- Use `Mod` for Cmd/Ctrl. Display with `HotkeyKbd` / `formatForDisplay`. Customize via recording on Settings → Shortcuts.
- Scopes: `enabled` and `target` (global, palette-closed, element ref). Letter chords ignore inputs by default; `Mod+…` and Escape do not.
- Look up APIs with `pnpm tanstack doc hotkeys … --json` before using a hook. Dev: Hotkeys panel in TanStack Devtools.
