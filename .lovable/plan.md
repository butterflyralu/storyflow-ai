## Goal
Surface a clear "Draft" vs "Evaluated (PASS/FAIL)" status indicator on:
1. The Story Draft card (and split-story cards)
2. The sidebar Sessions list and the Epic > Stories list

## Visual language (consistent everywhere)
- **Draft** — neutral dot + "Draft" label, `bg-muted-foreground/40`
- **Evaluated · PASS** — green dot, `bg-green-500` (or existing `primary` if green isn't tokenized)
- **Evaluated · FAIL** — amber/destructive dot, `bg-amber-500`
- Compact form: just a 6px dot with `title`/tooltip text in tight lists (sidebar). Full form: dot + small label/Badge in cards.

## Changes

### 1. `src/components/StoryPreview.tsx`
- In the header row, add a `Badge` next to the Priority badge:
  - No `evaluation` → "Draft" (variant `outline`, neutral)
  - `evaluation.overallResult === 'PASS'` → "Evaluated · Passed" (success styling)
  - `'FAIL'` → "Needs work" (amber/secondary)
- Keep the existing scorecard popover badge as-is; the new status badge is shown only when the scorecard popover badge isn't (or alongside it as a higher-level summary).

### 2. `src/components/SplitStoriesView.tsx` (`StoryCard`)
- Same status badge in the card header next to the "X of Y" badge, driven by the local per-card `evaluation` state.

### 3. `src/components/AppSidebar.tsx` — Epic > Stories list
- Each `story` already carries `evaluation_result` from `getEpicsWithStories` (full row). Extend the `EpicWithStories.stories` type to include `evaluation_result?: 'PASS' | 'FAIL' | null`.
- Render a 6px colored dot before the FileText icon (or replace it) with a `title` tooltip ("Draft" / "Evaluated — Passed" / "Evaluated — Needs work").

### 4. `src/components/AppSidebar.tsx` — Sessions list
- Extend `loadSessions` in `src/hooks/usePersistedChat.ts` to also return per-session evaluation status. Implementation: after the sessions query, run a second query against `generated_stories` filtered by `session_id IN (...)` selecting `session_id, evaluation_result, created_at`, then for each session pick the latest story's `evaluation_result` (or `null` if none).
- Update `SavedSession` type with `evaluation_status: 'PASS' | 'FAIL' | null`.
- Render the same dot indicator next to the session title (left of the title or right after the timestamp). Tooltip same as above.

## Out of scope
- No DB migrations.
- No edge function changes.
- No changes to evaluation triggering logic (use the existing `Evaluate` button added previously).
- No changes to FinalizeStep or admin dashboard.

## Technical notes
- Add a tiny shared helper (inline or in `src/lib/utils.ts`) `getEvalStatus(result?: string | null)` returning `{label, dotClass, variant}` to keep the three rendering sites consistent.
- All colors via Tailwind tokens already in the design system; if `bg-green-500`/`bg-amber-500` aren't acceptable, fall back to `bg-primary` (PASS) and `bg-destructive` (FAIL).
- Sessions query stays a single round-trip plus one extra simple `select` — no N+1.
