## Goal

Replace the two hardcoded DoR criteria in `evaluate-story` with a user-editable list scoped to each Product Context. Every existing and new context is seeded with the current two defaults ("Acceptance Criteria" and "Description"), which the user can rename, edit, delete, or extend.

## 1. Data — `product_contexts.dor_rules` (jsonb)

Add one column to the existing `product_contexts` table — no new table, no new RLS (existing per-user policies cover it).

```text
dor_rules  jsonb  NOT NULL  DEFAULT '[
  {"id":"ac",   "name":"Acceptance Criteria","description":"Acceptance criteria are present, grouped, and specific."},
  {"id":"desc", "name":"Description",        "description":"Description is clear and sufficient for development."}
]'
```

Migration also backfills the same default array into every existing row where `dor_rules` is null/empty so behavior is unchanged on day one.

Shape stored: `Array<{ id: string; name: string; description: string }>` — name + short description, as agreed.

## 2. UI — Product Context Settings

In `src/components/ProductContextSettings.tsx`, add a new `FieldGroup` titled **"Definition of Ready Rules"** above the AC Format tile. It renders the rules as a vertical list of cards, each with:

- `Input` for name
- `Textarea` (compact) for description
- Trash icon button (guarded by `AlertDialog`, per project rule on destructive actions)

Below the list: a single **"+ Add rule"** button that appends `{ id: crypto.randomUUID(), name: "", description: "" }`.

Local state lives next to the existing `values` state; the rules array is included in the same `handleSave` payload that already calls `updateContext` / `saveContext`. Save is disabled if any rule has an empty name.

Wizard onboarding (step that creates a fresh context) keeps the seeded defaults — no UI change there.

## 3. Types & persistence layer

- Extend `ProductContextInput` (in `src/types/wizard.ts`) and the corresponding row type in `src/services/types.ts` with `dorRules: DorRule[]`.
- Update `usePersistedContext` (and any mapper between snake_case row and camelCase input) to read/write `dor_rules` ↔ `dorRules`.
- `WizardContext` default product context gets the same two seeded rules so a brand-new unsaved context behaves identically.

## 4. Evaluator — `supabase/functions/evaluate-story/index.ts`

Today the function only reads `contextId` for tracing. Change:

1. After auth, if `contextId` is present, fetch the row with `authClient.from('product_contexts').select('dor_rules').eq('id', contextId).maybeSingle()`. RLS guarantees the user can only read their own.
2. Compute `dorRules`:
   - Use the fetched array if non-empty.
   - Otherwise fall back to the two hardcoded defaults already in the prompt (safety net for legacy rows or missing context).
3. Build the DoR section of the system prompt dynamically:
   ```
   ### Definition of Ready (DoR)
   - **<name>** – <description>
   - ...
   ```
   Inject it into `SYSTEM_PROMPT` via a small template function instead of the current static string. The verdict rules, INVEST section, and output requirements stay byte-identical.
4. Tool schema: `criterion` is already a free-form string, so no enum widening is needed. The `framework` enum stays `["INVEST", "DoR"]`. Model is instructed to set `criterion` exactly to the rule `name` so the UI can match.

No change to verdict values, scoring, `overallResult` rule, `improvedStory`, or the scorecard rendering — `pass_with_caveat` continues to work for any DoR rule the same way it does today.

## 5. Out of scope (explicit)

- No template/library of reusable rule sets.
- No severity / blocker flag — every DoR rule weighs the same as today.
- No changes to INVEST criteria, evaluation UI, or summary count logic.

## Files touched

- `supabase/migrations/<new>.sql` — add `dor_rules` column + backfill.
- `supabase/functions/evaluate-story/index.ts` — fetch rules, dynamic DoR section.
- `src/types/wizard.ts`, `src/services/types.ts` — `DorRule` type, field on context.
- `src/context/WizardContext.tsx` — seed defaults in initial state.
- `src/hooks/usePersistedContext.ts` — map `dor_rules` ↔ `dorRules`.
- `src/components/ProductContextSettings.tsx` — editor UI with AlertDialog-guarded delete.
