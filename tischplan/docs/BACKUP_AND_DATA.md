# Local Data, Backup, and Device Transfer

## Storage model

The application writes the complete `AppState` to one browser `localStorage` key after every controller commit:

```text
hand-aufs-herz.app-state.v1
```

The state contains:

- reservations and contact details,
- assignments and lifecycle timestamps,
- service-day weather/outside/Rush state,
- weekly opening hours, timing, and solver settings,
- task snoozes/completions,
- native-notification receipts,
- audit log,
- selected date/region/filter.

The write happens before the new state is published to the UI. If serialization or validation fails, the mutation is not accepted.

## No migration policy

This project is still under active development. There is deliberately no migration path.

- State must have `schemaVersion: 1`.
- Backups must have `format: "hand-aufs-herz-backup"` and `schemaVersion: 1`.
- Old, partial, malformed, or guessed shapes are rejected.
- A future incompatible model should deliberately increment the version and update tests/documentation rather than silently reinterpret data.

## Export

The export is a formatted JSON envelope:

```json
{
  "format": "hand-aufs-herz-backup",
  "schemaVersion": 1,
  "exportedAt": 178..., 
  "state": { }
}
```

The suggested filename includes the selected service date.

## Import

Import validates the complete envelope and state before replacing anything. On success it:

1. replaces the full local state,
2. increments the revision,
3. updates `lastSavedAt`,
4. adds a `backup.import` audit entry,
5. persists the imported state,
6. publishes it to the UI.

Import is replacement, not merge. Export a backup first when the current device has data worth keeping.

## Data safety limits

`localStorage` is appropriate for this local prototype, but it has explicit limits:

- no multi-user locking,
- no conflict resolution across devices,
- no server-side backup,
- browser/site-data clearing removes the state,
- private browsing may discard it,
- storage quotas vary by browser,
- data is not encrypted by the app.

The standalone `file://` distribution uses the same repository, but filesystem storage isolation is browser-specific and may depend on the HTML file's absolute path. Keep `Hand-aufs-Herz.html` at a stable location and export a backup before moving, renaming, or replacing it. Opening the hosted build and the filesystem build does not imply that they share one local state.

Use the JSON export for regular backups and before moving to another tablet.

## Privacy

Backup files contain names, phone numbers, email addresses, notes, timing history, and audit details as plain JSON. Treat them as business records containing personal data. Do not place them in public folders, public issue trackers, or unencrypted shared links.
