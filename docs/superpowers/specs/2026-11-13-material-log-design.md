# Material Log — Design

Date: 2026-11-13
Status: approved in conversation (owner of the project, 2026-11-13); build scheduled 21:50 IST same day.

## Intent

VCR's customer (the builder's owner and site staff) has no system today for tracking
material spending across sites. They want a simple **log**: staff record what came in,
what went out, and what it cost, and the owner sees running totals. It is its own thing:
cumulative arithmetic over log rows, independent of plots, payments, and enquiries.

It replaces the four hero cards at the top of the staff Overview (`/admin`), so it is the
first thing every staff role (owner, admin, manager) sees on sign-in.

## Goals

- Logging a common entry ("50 bags cement → Green Acres, ₹20,000") takes a few seconds,
  on a phone, with no required field beyond material, site, and amount.
- Entries can be made "whichever way they want": amount only, or quantity + unit + rate
  (amount auto-computed), with optional vendor and note.
- Summary amounts sit directly below the entry form: today, this month, per site,
  top materials, warehouse stock.
- Non-money updates are loggable too ("Slab poured, Block A").
- Every edit and delete is recorded (who, when, before/after). The log is trustworthy.

## Non-goals

- Vendor payments, invoices, GST, approvals, budgets, notifications.
- Linking expenses to plots, buyers, or the payment tracker.
- Labour/payroll tracking (can be logged as Miscellaneous if they want).
- CSV/PDF export (nice later; not in this build).

## Anti-goals (failure even if it "works")

- An entry form that feels like accounting software: many required fields, multi-step.
- A new expense site appearing on the public website (vcrdevelopers.in).
- Buyers or agents (also authenticated Supabase users) being able to read costs.
- Silent edits: a number changing with no trace of who changed it.

## Approaches considered

1. **Reuse `site_layouts` as the site list and create layouts for new sites.** Rejected:
   `site_layouts` drive the public site; every row needs a city and a public slug; an
   expense-only site would risk an empty public listing.
2. **Fully separate site list, ignore existing layouts.** Rejected: staff would retype
   names that already exist, and spelling drift would split totals.
3. **Chosen: own `material_sites` table that can link to a layout.** The site dropdown
   shows existing site layouts, the Warehouse, and private sites added via "+ New site".
   Picking a layout for the first time creates a `material_sites` row linked to it.
   Nothing is ever written to `site_layouts`.

The owner confirmed: "keep this as its own thing, regardless of what's already there",
and existing site layouts may appear as choices.

## Decided in conversation

- Placement: replaces the 4 hero cards on `AdminOverviewPage`. Rest of the page unchanged.
  Owner, admin and manager all see entry form + summary (owner's "daily update" is the
  summary block).
- Entry kinds (owner confirmed this reading):
  - **In**: material bought or received, at the warehouse or directly at a site. Counts as spend.
  - **Out**: material moved from the warehouse to a site. No new spend; reduces warehouse stock.
  - **Note**: a text update with no amount ("Slab poured, Block A"). Optionally tied to a site.
- Material: dropdown of common materials + **Other** (free-text name). Miscellaneous is
  a dropdown item with a required short description.
- Sites: existing layouts + Warehouse + "+ New site" (private, log-only).
- Edits and deletes logged with who/when/before/after.
- UI built with the `frontend-design` skill, in the existing dashboard design system.

## Data model (Supabase, Postgres)

New migration in `supabase/migrations/` (timestamped 20261113xxxxxx_material_log.sql).

`material_sites`
- `id uuid pk`, `name text not null`, `kind text check in ('site','warehouse') default 'site'`,
- `layout_id uuid null unique references site_layouts(id) on delete set null`,
- `created_by uuid references profiles(id)`, `created_at timestamptz default now()`,
- `archived boolean default false`.
- Seed one row: `name 'Warehouse', kind 'warehouse'`.
- Unique on `lower(name)` among non-archived rows, to stop duplicate spellings.

`material_entries`
- `id uuid pk`
- `kind text not null check in ('in','out','note')`
- `entry_date date not null default (now() at time zone 'Asia/Kolkata')::date` (editable; back-dating allowed)
- `site_id uuid references material_sites(id)`: where it landed (In: received at; Out: destination; Note: optional)
- `from_site_id uuid references material_sites(id)`: Out only, defaults to the Warehouse
- `material text`: required for in/out, null for note
- `quantity numeric null`, `unit text null`, `rate numeric null`
- `amount numeric null`: required (> 0) for In, either typed or `quantity × rate`; null/ignored for Out and Note
- `vendor text null`, `note text null` (required for Note and for Miscellaneous)
- `created_by uuid`, `created_by_name text`, `created_at timestamptz default now()`, `updated_at timestamptz`
- `deleted_at timestamptz null`: soft delete; deleted rows excluded from totals but kept
- Check constraints enforce the per-kind rules above.
- Index on `(entry_date desc)`, `(site_id)`.

`material_entry_history`
- `id`, `entry_id`, `action text check in ('create','edit','delete')`,
  `changed_by uuid`, `changed_by_name text`, `changed_at timestamptz default now()`,
  `before jsonb`, `after jsonb`.
- Written **by a database trigger** on `material_entries` (insert/update), so the app
  cannot skip it. Rows are insert-only (no update/delete policy).

**Access (RLS)**: all three tables readable and writable only by profiles with role in
(`owner`,`admin`,`manager`), via a `is_staff()` SQL helper (security definer, fixed
search_path) that checks `profiles.role` for `auth.uid()`. Existing tables use
`auth.role() = 'authenticated'`, which would let buyers and agents in; this feature must not.
Hard deletes are not granted; delete = set `deleted_at`.

**Role helper (builder call, settled in review)**: the repo's SQL files disagree on which
role values exist (`fix_buyer_rls.sql` constraint lacks `admin`; `admin_create_staff`
creates `admin`). Add a new `is_staff()` that checks `role in ('owner','admin','manager')`;
correct whichever subset exists live. Do **not** modify the existing `is_admin()`
(it gates enquiries/profiles today; changing it changes current access).

**Role lock (owner approved 2026-11-13, same migration)**: today any signed-in user can
set their own `profiles.role` (policy `profiles_self_update` in `schema_phase3.sql` has
no column limit), and `handle_new_user` copies `role` from sign-up metadata. Either lets a
buyer/agent become `owner` and read costs. The migration must:
- add a `BEFORE UPDATE` trigger on `profiles` that raises if `role` changes, unless the
  caller is the database itself / service role (`auth.uid() is null`, which covers the SQL
  editor and `admin_create_staff`, a security-definer function) or the caller is an `owner`;
- replace `handle_new_user` so it ignores `raw_user_meta_data->>'role'`: omit `role` from
  the insert so the column default applies. Staff created via `admin_create_staff` are
  unaffected (it sets the role afterwards, running as definer).
- Nothing in `src/` updates `profiles.role` or calls `signUp`, so no app flow breaks.

**Applying it**: this Mac's Supabase CLI is not linked to the VCR project. The builder
writes the migration file; the owner runs it in the Supabase SQL editor (same as the
2026-11-13 lock-down migration). Until it is run, the Overview shows a calm
"Material log isn't set up yet" state instead of an error, and the rest of the page works.

## Materials list (starting set, editable in code)

Cement · M-sand · P-sand · River sand · 20mm jelly · 40mm jelly · 12mm jelly ·
Steel / TMT bars · Binding wire · Bricks · Solid blocks · Hollow blocks · Size stone ·
Boulders · Red soil / Murram · Water tanker · Shuttering material · Electrical items ·
Plumbing items · Paint · Tiles · Diesel · Miscellaneous · Other…

Custom names typed via Other are offered back in the dropdown afterwards (distinct
materials from existing entries), so "Kerb stones" is typed once.

Units: bags, tonnes, cft, brass, loads, trips, kg, nos, litres, sq ft, rft.
Remember the last unit used per material (per device, localStorage) as the default.

## Calculations

- **Spend** = sum of `amount` over non-deleted `in` entries. Out and Note never add spend.
- **Today** / **This month**: by `entry_date` in Asia/Kolkata.
- **Per site (this month)**: spend grouped by `site_id`, highest first. Warehouse appears as a site.
- **Top materials (this month)**: spend grouped by material, top 5.
- **Warehouse stock**: per (material, unit): sum of In quantity at the warehouse minus sum of
  Out quantity from the warehouse. Only rows with a quantity count. Units are not converted;
  different units show as separate lines. Negative stock shows as-is (flags a missed In).
- All arithmetic lives in a pure module (e.g. `src/lib/materialLog.js`) with unit tests.

## Screen

Top of `/admin`, replacing `.dash-hero-stats`:

```
┌ Material log ─────────────────────────── [ In | Out | Note ] ┐
│ Material [Cement ▾]   Site [Green Acres ▾]   Date [Today]     │
│ Qty [50] [bags ▾]  Rate [₹400]   Amount [₹20,000]            │
│ + vendor / note                                    [ Log ]   │
└───────────────────────────────────────────────────────────────┘
 Today ₹48,200 │ This month ₹6.1 L │ Warehouse stock ▸
 By site:      Green Acres ₹3.4 L ▓▓▓▓▓▓  Hill View ₹1.5 L ▓▓▓
 Top materials: Cement ₹2.1 L · Steel ₹1.8 L · M-sand ₹0.9 L
 ── Recent ──────────────────────────────────────────────────
 10:42  IN   Cement 50 bags → Green Acres   ₹20,000   Ravi  ⋯
 09:15  OUT  M-sand 2 loads Warehouse → Hill View        Ravi  ⋯
 08:50  NOTE Slab poured, Block A (Green Acres)          Owner ⋯
 [ Show more ]  filter: site ▾  material ▾  date range
```

- Out swaps the fields to From (Warehouse) → To site; hides Rate/Amount.
- Note shows a single text box + optional site.
- After Log: the form keeps kind, site, and date (people log several items for the same
  site in a row), clears material/qty/amount, focuses Material, and the new row appears at
  the top of Recent with a brief highlight.
- Row menu (⋯): Edit, Delete (confirm), History (shows the change trail).
- Phone width: the form stacks to one column; summary tiles stack; Recent rows wrap.
- Use the `frontend-design` skill; stay inside the `dash-*` system in `src/css/dashboard.css`
  (light main surface, `dash-glass` cards, Material Symbols icons), no new UI libraries.

## Left to the builder

- Component split (e.g. `MaterialLog/EntryForm`, `Summary`, `RecentLog`) and file locations.
- How the site dropdown merges layouts + material_sites (client-side is fine at this scale).
- Test tooling for the pure calculation module (Vitest is a reasonable add; there is no
  unit test runner today, only Playwright).
- Exact copy, spacing, and the empty/first-run state.
- Whether "Show more" paginates or loads by month.
