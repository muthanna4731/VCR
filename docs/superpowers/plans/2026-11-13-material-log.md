# Material Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four hero cards on `/admin` with a Material Log: a fast entry form (In / Out / Note) plus running spend and stock summaries, backed by new Supabase tables with an audit trail and a profiles role lock.

**Architecture:** One SQL migration (tables, history trigger, RLS via `is_staff()`, role lock). One pure JS module holds all arithmetic and validation (unit-tested with Vitest). One hook loads and mutates data. Three presentational components (form, summary, recent log) composed by `MaterialLog.jsx`, mounted at the top of `AdminOverviewPage`.

**Tech Stack:** React 19, Vite 5, plain CSS (`dash-*` system), Supabase JS v2, Postgres 15+. Vitest added for unit tests. Local Homebrew Postgres (`/opt/homebrew/bin/postgres`, `psql`) for testing the migration.

**Spec:** `docs/superpowers/specs/2026-11-13-material-log-design.md`

## Global Constraints

- Work on branch `feat/material-log`. Never commit to or push `main` (pushing main auto-deploys production). Do not push at all.
- Do not apply the migration to the live Supabase project; the owner runs it in the SQL editor.
- JavaScript only (no TypeScript). Plain CSS; no UI libraries. Icons: Material Symbols (`<span className="material-symbols-outlined">`), already loaded.
- New CSS lives in `src/css/material-log.css`, classes prefixed `dash-ml-`. Reuse `dash-glass` for cards.
- Never write to `site_layouts`.
- Dates are Asia/Kolkata calendar dates (`YYYY-MM-DD`).
- Spend counts only non-deleted `in` entries. Out and Note never add spend.
- Materials list, units list and per-kind rules: copy verbatim from the spec.
- `localStorage` access always wrapped in try/catch.
- Files live under iCloud: if a command hangs at 0% CPU, a file is evicted. See memory note: restore with `git cat-file blob ":$f" > "$f.restore" && mv -f "$f.restore" "$f"`.

## Review Focus

1. **Late-evening entries** (e.g. 11:30 PM IST) must count as *today* in IST, not the next/previous UTC day. Pinned in Task 1 (`istDate`).
2. **Deleted entries** must vanish from every total and from warehouse stock, but stay in history. Pinned in Task 1 (`summarize`) and Task 2 (SQL test).
3. **Number typing**: "20,000", " 400 ", "" and "abc" in amount/qty/rate fields. Commas strip, blanks are null, junk is a validation error, never NaN in totals. Pinned in Task 1 (`parseNumber`, `validateEntry`).
4. **Same material typed differently** ("cement", "Cement ") must group as one in totals, stock and the dropdown. Pinned in Task 1 (`summarize`, `materialOptions`).
5. **Migration not yet run**: the Overview must show a calm "not set up yet" card and the rest of the page must still work. Pinned in Task 1 (`isMissingTableError`) and Task 5 (manual check).

---

### Task 1: Pure calculation module + Vitest

**Files:**
- Modify: `package.json` (add devDependency `vitest`, script `"test": "vitest run"`)
- Create: `src/lib/materialLog.js`
- Test: `src/lib/materialLog.test.js`

**Interfaces:**
- Produces (all named exports of `src/lib/materialLog.js`):
  - `MATERIALS: string[]` (spec order, ending `'Miscellaneous'`; `'Other'` is NOT in it, the UI appends it)
  - `UNITS: string[]` = `['bags','tonnes','cft','brass','loads','trips','kg','nos','litres','sq ft','rft']`
  - `parseNumber(value: string|number|null): number|null`: strips commas/spaces; `''`/null → `null`; non-numeric → `NaN`
  - `computeAmount({ quantity, rate, amount }): number|null`: typed amount (>0) wins; else `quantity*rate` rounded to 2 dp when both >0; else `null`
  - `validateEntry(entry): { ok: boolean, errors: Record<string,string> }`. Entry shape `{ kind, material, siteId, fromSiteId, quantity, unit, rate, amount, note }` (raw strings allowed). Rules: in = material + siteId + computed amount > 0; out = material + siteId + fromSiteId, `siteId !== fromSiteId`, quantity > 0; note = note non-empty; material `'Miscellaneous'` requires note; any `NaN` numeric field = error on that field.
  - `istDate(date?: Date): string`: `YYYY-MM-DD` in Asia/Kolkata (use `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })`)
  - `materialKey(name: string): string`: trimmed, lowercased
  - `summarize(entries, sites, today: string)`: returns `{ todaySpend, monthSpend, bySite: [{ siteId, name, amount }], topMaterials: [{ material, amount }], warehouseStock: [{ material, unit, quantity }] }`. Entries use DB column names (`kind, entry_date, site_id, from_site_id, material, quantity, unit, amount, deleted_at`); sites `[{ id, name, kind }]`. bySite/topMaterials are this month only, sorted desc; topMaterials max 5. Stock: all time, warehouse = sites with `kind === 'warehouse'`; skip rows without quantity; group by `materialKey + unit`; display name = first-seen spelling.
  - `materialOptions(entries): string[]`: `MATERIALS` plus distinct custom names from entries (by `materialKey`) not already in `MATERIALS`, inserted before `'Miscellaneous'`, alphabetical.
  - `buildSiteOptions(layouts, sites): Array<{ value, label, siteId, layoutId, kind }>`: Warehouse(s) first, then every layout (using its linked site's id if one exists, else `siteId: null`), then private sites with no `layout_id`; archived sites excluded; `value` is `site:<id>` or `layout:<id>`.
  - `formatINR(n): string`: `₹20,000` (en-IN grouping, no decimals unless fractional)
  - `formatINRCompact(n): string`: `₹6.1 L`, `₹1.2 Cr`, below 1 lakh `₹48,200`
  - `isMissingTableError(err): boolean`: true for Postgres `42P01` or PostgREST `PGRST205`/`PGRST202`, or message matching `/does not exist|schema cache/i`

- [ ] **Step 1: Add Vitest.** `npm install -D vitest@^2` and add `"test": "vitest run"`. Check that `npm test` runs (it reports no test files).
- [ ] **Step 2: Write failing tests** in `src/lib/materialLog.test.js`, at minimum:

```js
expect(parseNumber('20,000')).toBe(20000)
expect(parseNumber(' 400 ')).toBe(400)
expect(parseNumber('')).toBeNull()
expect(Number.isNaN(parseNumber('abc'))).toBe(true)
expect(computeAmount({ quantity: '50', rate: '400', amount: '' })).toBe(20000)
expect(computeAmount({ quantity: '50', rate: '400', amount: '19,500' })).toBe(19500)
expect(computeAmount({ quantity: '', rate: '', amount: '' })).toBeNull()
expect(istDate(new Date('2026-11-13T18:45:00Z'))).toBe('2026-11-14') // 00:15 IST
expect(istDate(new Date('2026-11-13T18:00:00Z'))).toBe('2026-11-13') // 23:30 IST
expect(validateEntry({ kind: 'in', material: 'Cement', siteId: 's1', quantity: '50', rate: '400' }).ok).toBe(true)
expect(validateEntry({ kind: 'in', material: 'Cement', siteId: 's1' }).errors.amount).toBeTruthy()
expect(validateEntry({ kind: 'in', material: 'Cement', siteId: 's1', amount: 'abc' }).errors.amount).toBeTruthy()
expect(validateEntry({ kind: 'out', material: 'M-sand', siteId: 'w', fromSiteId: 'w', quantity: '2' }).errors.siteId).toBeTruthy()
expect(validateEntry({ kind: 'note', note: '  ' }).ok).toBe(false)
expect(validateEntry({ kind: 'in', material: 'Miscellaneous', siteId: 's1', amount: '500' }).errors.note).toBeTruthy()
```

  The `summarize` fixture uses sites `W` (warehouse), `A`, `B` and today `2026-11-13`. It includes: in Cement 50 bags ₹20,000 at A today; in `'cement '` 100 bags ₹40,000 at W on 2026-11-02; out Cement 30 bags W→A today; in Steel ₹90,000 at B on 2026-10-30 (last month); a deleted in ₹99,999 at A today; and a note. Assert:
  - `todaySpend 20000`, `monthSpend 60000`
  - `bySite = [W 40000, A 20000]`
  - `topMaterials[0] = { material: 'Cement', amount: 60000 }`
  - `warehouseStock = [{ material: 'cement', unit: 'bags', quantity: 70 }]`. The display name is the first-seen spelling, trimmed. Iterate entries in the given order: the fixture lists the W entry first.
  - no NaN anywhere.

  `materialOptions([{ material: 'Kerb stones' }, { material: 'kerb stones' }, { material: 'cement' }])`: contains `'Kerb stones'` once, before `'Miscellaneous'`, and no duplicate Cement.
  `isMissingTableError({ code: '42P01' })` is true; `isMissingTableError({ code: '23505' })` is false.
  `formatINRCompact(610000)` is `'₹6.1 L'`; `formatINR(20000)` is `'₹20,000'`.
  `buildSiteOptions`: warehouse first; a layout linked to a site yields that `siteId`; an unlinked layout yields `siteId: null`; archived sites are dropped.
- [ ] **Step 3: Run `npm test` and confirm it fails** (module missing).
- [ ] **Step 4: Implement `src/lib/materialLog.js`** to the interfaces above.
- [ ] **Step 5: Run `npm test` and confirm all tests pass.**
- [ ] **Step 6: Commit:** `git add package.json package-lock.json src/lib/materialLog.js src/lib/materialLog.test.js && git commit -m "feat: material log calculations with unit tests"`

---

### Task 2: Migration (tables, history trigger, RLS, role lock) + local SQL test

**Files:**
- Create: `supabase/migrations/20261113120000_material_log.sql`
- Create: `supabase/tests/material_log_test.sql` (assertions)
- Create: `supabase/tests/auth_stub.sql` (minimal stand-ins: schema `auth`, `auth.users(id uuid pk, raw_user_meta_data jsonb, email text)`, `auth.uid()` reading `current_setting('request.jwt.claim.sub', true)::uuid`, `auth.role()`, roles `anon`, `authenticated`, `service_role`, and minimal `public.profiles` / `public.site_layouts` / `public.cities` matching `supabase/schema.sql` + `schema_phase3.sql` with role check `('owner','manager','admin','buyer','agent')`)
- Create: `scripts/test-migration.sh` (does `initdb` into a temp dir, then `pg_ctl` start on port 54329, loads `auth_stub.sql`, the migration, then the test file with `psql -v ON_ERROR_STOP=1`, then stops the server and removes the dir)

**Interfaces:**
- Produces tables `material_sites`, `material_entries`, `material_entry_history` with the columns exactly as in the spec's Data model section. Also:
  - `material_entries.created_by uuid default auth.uid()`
  - `created_by_name` is filled by a `BEFORE INSERT` trigger from `profiles.full_name`
  - `updated_at` is set by a `BEFORE UPDATE` trigger
- Produces function `public.is_staff() returns boolean`: security definer, `set search_path = public`, stable. True when `profiles.role in ('owner','admin','manager')` for `auth.uid()`.
- Produces an `AFTER INSERT OR UPDATE` trigger on `material_entries` that writes `material_entry_history`:
  - action `create` on insert
  - action `delete` when `deleted_at` goes from null to not null
  - action `edit` otherwise
  - `before`/`after` = `to_jsonb(OLD/NEW)`, plus `changed_by`/`changed_by_name`
- Produces the seed row: `Warehouse`, kind `warehouse`, inserted with `on conflict do nothing`.
- Produces the role lock:
  - trigger `profiles_role_guard` (`BEFORE UPDATE OF role ON profiles`) raises `'Only an owner can change roles'` when `NEW.role IS DISTINCT FROM OLD.role` and `auth.uid() IS NOT NULL` and the caller is not an owner
  - `handle_new_user()` is replaced by a version that omits `role` from its insert, so the column default applies; it keeps `security definer` and `set search_path = public`
- RLS on all 3 tables, all gated by `is_staff()`:
  - `material_sites`: select / insert / update
  - `material_entries`: select / insert / update
  - `material_entry_history`: select only; it is written only by the security-definer trigger function
  - No delete policies anywhere
- Unique index on `lower(name)` for `material_sites where not archived`. Unique on `layout_id`.
- The migration must be idempotent: `if not exists`, `create or replace`, `drop policy if exists` / `drop trigger if exists` before create. The owner may run it twice.
- Header comment, in the style of `20261113000000_lock_admin_functions.sql`: what it does, why the role lock is there, "Run in: Supabase dashboard → SQL Editor. Safe to run more than once."

- [ ] **Step 1: Write `supabase/tests/material_log_test.sql`** assertions. Each one uses `DO $$ ... $$` blocks that `RAISE EXCEPTION` on failure, and switches users with `set local role authenticated; set local request.jwt.claim.sub = '<uuid>'` inside transactions.
  - A buyer cannot select from `material_entries`: 0 rows visible after the owner inserts one.
  - A manager can insert an `in` entry. A history row with action `create` exists and `created_by_name` is filled.
  - A manager can update `amount`, which creates an `edit` history row whose `before->>'amount'` is the old value.
  - Setting `deleted_at` creates a `delete` history row.
  - The `in` check constraint rejects `amount` null or ≤ 0. The `note` constraint rejects an empty note.
  - A manager cannot `delete from material_entries` (0 rows affected or a permission error).
  - A buyer updating their own `profiles.role` to `owner` raises `Only an owner can change roles`.
  - The owner changing another user's role succeeds. With no JWT (superuser/SQL editor), a role change succeeds.
  - A manager cannot insert into `material_entry_history` directly.
  - Running the migration file a second time does not raise.
- [ ] **Step 2: Write `scripts/test-migration.sh`** and the stub. Run `bash scripts/test-migration.sh` and confirm it fails (the migration file is missing).
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4: Run `bash scripts/test-migration.sh` and confirm it ends with `ALL MATERIAL LOG SQL TESTS PASSED`** (the test file's last line prints this).
- [ ] **Step 5: Commit:** `git add supabase/migrations/20261113120000_material_log.sql supabase/tests scripts/test-migration.sh && git commit -m "feat: material log tables, audit trail, staff-only RLS and profiles role lock"`

---

### Task 3: Data hook `useMaterialLog`

**Files:**
- Create: `src/hooks/useMaterialLog.js`

**Interfaces:**
- Consumes: `supabase` (`src/lib/supabase.js`), `runSupabaseRequest` / `runSupabaseMutation` (`src/lib/supabaseRequest.js`), and `isMissingTableError`, `istDate`, `computeAmount`, `parseNumber` from Task 1.
- Produces `useMaterialLog()`, which returns:
  - `{ status: 'loading'|'ready'|'missing'|'error', error, entries, sites, layouts, reload }`
  - `addEntry(form): Promise<entry>`: `form` is the `validateEntry` shape plus `entryDate`, `vendor`, and `siteValue`/`fromSiteValue` (option `value`s from `buildSiteOptions`).
  - `updateEntry(id, form): Promise<entry>`
  - `deleteEntry(id): Promise<void>`: sets `deleted_at = now()`
  - `addSite(name): Promise<site>`: `kind 'site'`
  - `resolveSiteId(optionValue): Promise<string>`: for `layout:<id>`, upserts a `material_sites` row `{ name: layout.name, layout_id }` with `onConflict: 'layout_id'` and returns its id; for `site:<id>`, returns the id.
  - `loadHistory(entryId): Promise<historyRow[]>`, newest first.
- Loading:
  - `site_layouts` (`id, name`)
  - `material_sites` (all columns)
  - every `material_entries` row with `deleted_at is null`, ordered `entry_date desc, created_at desc`, fetched in pages of 1000 with `.range()` until a short page comes back (PostgREST caps rows at 1000)
- Any load error where `isMissingTableError` is true sets `status: 'missing'`.
- Mutations update local state optimistically from the returned row (`.select().single()`). Do not refetch everything.

- [ ] **Step 1: Implement the hook.** Cancel state updates after unmount (follow the `cancelled` pattern in `AdminOverviewPage.jsx`).
- [ ] **Step 2: Run `npm run build` and confirm it passes.** Run `npm test` and confirm it still passes.
- [ ] **Step 3: Commit:** `git commit -m "feat: material log data hook"`

---

### Task 4: UI components (frontend-design skill)

Invoke the `frontend-design` skill before writing this task's UI. Stay inside the existing dashboard look: read `.dash-glass`, `.dash-hero-*` and `.dash-filter-select` in `src/css/dashboard.css` first. Match its fonts, radii, colours and rem scale.

**Files:**
- Create: `src/components/dashboard/material-log/MaterialLog.jsx`. Composes the parts and calls the hook. Renders one of: a skeleton while loading; the "Material log isn't set up yet. Run supabase/migrations/20261113120000_material_log.sql in the Supabase SQL editor." card when `missing`; an error card with Retry; or the form, summary and recent log.
- Create: `src/components/dashboard/material-log/EntryForm.jsx`
- Create: `src/components/dashboard/material-log/MaterialSummary.jsx`
- Create: `src/components/dashboard/material-log/RecentLog.jsx`
- Create: `src/css/material-log.css` (imported by `MaterialLog.jsx`)

**Interfaces:**
- Consumes: Task 1 exports and Task 3's `useMaterialLog()` return value.
- `EntryForm` props: `{ siteOptions, materialOptions, initial?, onSubmit(form), onAddSite(name), onCancel? }`.
- `MaterialSummary` props: `{ summary, sites }`.
- `RecentLog` props: `{ entries, sites, siteOptions, onEdit(entry), onDelete(entry), onHistory(entry) }`.

Behaviour (from the spec, Screen section):
- [ ] **Step 1: EntryForm.**
  - Kind segmented control In / Out / Note. Default In.
  - In shows: Material, Site, Date (defaults to `istDate()`), Qty + Unit, Rate, Amount. Amount shows `computeAmount` live as a placeholder; typing an amount overrides it. Vendor and Note sit behind "+ vendor / note".
  - Out shows: Material, From (defaults to the warehouse), To site, Date, Qty + Unit, Note. No money fields.
  - Note shows: a text box, an optional site, and Date.
  - Material `<select>` from `materialOptions` plus a final `Other…` option. Picking Other reveals a text input, which is focused on reveal.
  - Site `<select>` from `siteOptions` plus a final `+ New site…` option. Picking it reveals an inline name input with Add, which calls `onAddSite` and selects the new site.
  - The unit defaults to the last unit used for that material (`localStorage` key `vcr.ml.unit.<materialKey>`, wrapped in try/catch).
  - Show errors from `validateEntry` inline under each field only after a submit attempt.
  - The Log button is disabled while submitting, so a double tap cannot double-log.
  - After a successful submit:
    - keep kind, site and date
    - clear material, qty, rate, amount, vendor and note
    - focus Material
  - Use `inputmode="decimal"` on numeric inputs. Inputs must be at least 44px tall on touch.
- [ ] **Step 2: MaterialSummary.**
  - Tiles: Today, This month, Warehouse stock. The stock tile shows a count of lines and expands to the list.
  - "By site" rows with proportional bars.
  - Top materials as a single line of chips.
  - Use `formatINRCompact` in the tiles and `formatINR` in tooltips (via the `title` attribute).
  - With zero entries, show a single friendly line instead of empty tiles.
- [ ] **Step 3: RecentLog.**
  - The newest 30 entries, with "Show more" adding 30 at a time.
  - Filters: site, material, from-date and to-date, all applied client-side.
  - Each row shows: time or date, a kind badge (IN / OUT / NOTE), the material with qty and unit, the site (or "From → To" for an out), the amount for an in, the author, and a ⋯ menu.
  - The ⋯ menu has Edit, Delete and History:
    - Edit opens `EntryForm` with `initial` in a modal.
    - Delete asks for confirmation with `window.confirm`, matching the existing pattern.
    - History opens a modal listing `loadHistory` rows. Each row shows who, when, the action, and the changed fields as `field: old → new`.
  - Briefly highlight a newly added row: a CSS animation of 1.5s at most.
- [ ] **Step 4: Responsive layout.** At ≤ 640px the form is one column, tiles stack two-up then one-up, and there is no horizontal scroll at 375px width.
- [ ] **Step 5: Run `npm run build` and confirm it passes.** Run `npm test` and confirm it passes.
- [ ] **Step 6: Commit:** `git commit -m "feat: material log entry form, summary and recent log UI"`

---

### Task 5: Mount on Overview, replacing the hero cards

**Files:**
- Modify: `src/pages/AdminOverviewPage.jsx`. Remove the `dash-hero-stats` block (around lines 278–331) and render `<MaterialLog />` as the first child of `.dash-page`. Also render it above the loading and error returns (around lines 203–204), so the log appears even while the overview's own data loads or fails. Remove any variables used only by the removed cards (e.g. `totalPortfolio`, `inventorySoldPct`). Leave the charts and lists untouched.
- Modify: `src/css/dashboard.css`. Leave the `.dash-hero-*` rules in place: other pages may use them. Check with `grep -rn "dash-hero" src`. Delete them only if nothing else uses them.

- [ ] **Step 1: Make the edit.** Lazy-loading is not needed: MaterialLog is part of the admin chunk.
- [ ] **Step 2: Run `npm run build` and confirm it passes.** Run `npm test` and confirm it passes.
- [ ] **Step 3: Manual check.** Run `npm run dev`, sign in as staff (if credentials are unavailable, mention that in the hand-off and skip this step), and open `/admin`. Against the live DB, where the migration is not yet run, the "not set up yet" card shows and the charts below still render. Check at 375px width too.
- [ ] **Step 4: Commit:** `git commit -m "feat: material log replaces overview hero cards"`

---

## Hand-off (after final review)

Report:
- the branch name
- test and build results
- the exact file the owner must run: `supabase/migrations/20261113120000_material_log.sql` in Supabase → SQL Editor
- that nothing was pushed or deployed
