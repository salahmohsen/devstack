# Portfolio-entry sync lives inside entity repositories

Portfolio entries (the `portfolio_entry` join-table rows that gate
visibility) must stay in sync with their owning entity's `portfolioEntryId`
FK. The original ADR-0013 envisioned a single `portfolio.toggle` route as
the only write path, but in practice the entity create/update forms also
send `includedInPortfolio` as part of the entity payload. Moving the
portfolio-entry create/delete logic _into_ the entity repository methods
(`repo.create` / `repo.update`) — not the route handlers — makes the
sync atomic with the entity write and eliminates a class of ordering bugs.

## Context

Every entity update handler (experience, project, stack) followed the same
broken pattern:

```
entity = repo.update(id, data)          // re-fetches — portfolioEntryId is stale
portfolioEntryRepo.create(...)           // creates portfolio_entry row BUT never sets entity's FK
return mapper(entity)                    // includedInPortfolio = false — WRONG
```

Two concrete failures: (1) creating a portfolio entry never set the
entity's `portfolioEntryId` FK, so the returned response showed
`includedInPortfolio: false`. (2) deleting a portfolio entry happened
_after_ the entity was re-fetched, so the returned response showed
`includedInPortfolio: true` even though the entry was just removed.
The dedicated `portfolio.toggle` route worked correctly (it returns the
portfolio_entry directly) but the form-submit path was silently broken.

## Decision

- `experienceRepository`, `projectRepository`, and `stackRepository` each
  gain an optional `includedInPortfolio?: boolean` parameter on both
  `create()` and `update()`. The parameter is a separate options bag, not
  part of the entity data type, because `includedInPortfolio` is a derived
  boolean, not a DB column.

- Portfolio sync happens **inside the same Drizzle transaction** as the
  entity insert/update. Inside the transaction:
  1. Entity row is written (insert or update).
  2. If `includedInPortfolio` changed, the `portfolio_entry` row is
     created or deleted accordingly.
  3. On create, the entity's `portfolioEntryId` FK is set to the new
     portfolio entry's ID.
  4. The entity is re-fetched with its relations using `tx.query.*` so
     the FK value is visible in the returned object.

- Route handlers destructure `includedInPortfolio` from the input but
  pass it as the second parameter instead of handling it themselves.
  The redundant `findAll()` + `Math.max` sort-order computation that
  existed in both the route handler and the repo's `create` method is
  removed from the route handler — the repo already owns this.

- The `portfolio.toggle` route stays as-is. It is a different entry
  point (list-view quick toggle) and rightly bypasses entity field
  validation. The two paths converge on the same `portfolio_entry` table
  but are not refactored into one another.

- Contacts are unchanged. The profile update route handles contact
  values; the toggle route handles portfolio visibility. Contacts have
  no single-ID update path — they use a composite key `(userId, type)` —
  so the form-update path does not apply.

## Consequences

- Portfolio entries are now always consistent with the entity FK. No
  more stale `includedInPortfolio` in update responses.
- The entity repository now has a cross-table responsibility. This
  violates strict single-table separation, but the FK lives on the
  entity table and referential integrity is the repository's job.
- Route handlers become thinner — they destructure and forward, no
  longer calling `portfolioEntryRepository` directly.
- This partially supersedes ADR-0013's prediction that forms would call
  `portfolio.toggle` separately. ADR-0013's core insight (a dedicated
  join table rather than a boolean column) is unchanged; we simply
  added a second write path for the form-submit flow.
