## Context vs. existing OWASP plan
`.lovable/plan.md` Step 7 (LLM09 sanity check) stays untouched and continues to fire only when the model returns all-PASS with empty rationales. Adding `PASS_WITH_CAVEAT` should naturally reduce that pattern by giving nuanced cases a real verdict.

## Files (located, not guessed)
- `supabase/functions/evaluate-story/index.ts` — system prompt + tool schema enum.
- `src/services/types.ts` — `ScoreResult` (line 173).
- `src/types.ts` — duplicate `ScoreResult` (line 143).
- `src/lib/evalStatus.ts` — `EvalStatus` helper.
- `src/components/EvaluationCard.tsx` — scorecard rendering, summary count.

`src/integrations/supabase/types.ts` is auto-generated and not edited.

## 1. Schema — add `PASS_WITH_CAVEAT`

Keeping uppercase to match the existing convention:
- `src/services/types.ts` and `src/types.ts`: `ScoreResult = "PASS" | "PASS_WITH_CAVEAT" | "FAIL"`. `OverallResult` stays `"PASS" | "FAIL"` (overall verdict remains binary; caveats are per-criterion only).
- `src/lib/evalStatus.ts`: extend `EvalStatus` with `'PASS_WITH_CAVEAT'`; add a third branch returning amber styling tokens (mirrors existing PASS/FAIL branches).
- `supabase/functions/evaluate-story/index.ts` tool schema: change
  ```ts
  result: { type: "string", enum: ["PASS", "FAIL"] }
  ```
  to
  ```ts
  result: { type: "string", enum: ["PASS", "PASS_WITH_CAVEAT", "FAIL"] }
  ```

## 2. Edge function — prompt updates

In `SYSTEM_PROMPT`, replace the bullets for **Independent**, **Negotiable**, **Small** and add a global consistency rule.

> ### INVEST
> - **Independent** — Distinguish hard vs soft dependencies.
>   - **FAIL (hard dependency):** the story cannot be started or tested until another specific story is complete. The rationale MUST name the blocking story or capability.
>   - **PASS_WITH_CAVEAT (soft dependency):** the story assumes some infrastructure/context exists but can be developed and tested independently. The rationale MUST name the assumed dependency.
>   - **PASS:** truly self-contained.
> - **Negotiable** — If the story is specific enough that there is little room for implementation discussion without grooming, return **PASS_WITH_CAVEAT** and state in the rationale what still needs to be discussed. Reserve **PASS** for stories that genuinely leave implementation open.
> - **Valuable** — (unchanged)
> - **Estimable** — (unchanged)
> - **Small** — A story clearly completable within a single sprint is **PASS**. A borderline story (completable in a sprint but at the upper edge of acceptable scope) is **PASS_WITH_CAVEAT** with a rationale stating what makes it borderline. A story that clearly spans multiple sprints is **FAIL**.
> - **Testable** — (unchanged)

Add immediately after the INVEST/DoR sections:

> ## Verdict consistency rule (STRICT)
> If your rationale describes a limitation, caveat, or condition for any criterion, the verdict MUST reflect that — use **PASS_WITH_CAVEAT** or **FAIL**, never **PASS**. A PASS verdict paired with a caveat in the rationale is a contradiction and is invalid output.

No other prompt sections change.

## 3. UI — `EvaluationCard.tsx`

### 3a. Three visual states per row
- `PASS` → green `Check` (existing tokens).
- `FAIL` → red `X` (existing tokens).
- `PASS_WITH_CAVEAT` → **amber `AlertTriangle`** from lucide-react. Reuse the amber tokens already used by the inline evaluation banner (the implementer should grep for the existing amber/warning token class rather than introducing new ones).

Refactor inline ternaries into a small `getVariantClasses(result)` + `getVariantIcon(result)` helper to keep the JSX readable with three states.

### 3b. Rationale visibility — explicit condition change
**This is the easy-to-miss bit, called out per the user's note.** The current code is:
```tsx
{item.result === 'FAIL' && (
  <div className="...">
    {/* explanation + suggested fix */}
  </div>
)}
```
The diff MUST change this to:
```tsx
{(item.result === 'FAIL' || item.result === 'PASS_WITH_CAVEAT') && (
  <div className="...">
    {/* explanation + suggested fix */}
  </div>
)}
```
PASS rows stay collapsed (rationale is shown only on hover/popover as today). PASS_WITH_CAVEAT rows expand inline so the caveat is immediately visible — same treatment as FAIL.

A safer factoring: introduce `const showRationale = item.result !== 'PASS';` and use that in the JSX. Either form is fine; the diff must show this condition explicitly.

### 3c. Summary count — conditional segments

Compute three counts:
```ts
const passed = scorecard.filter(c => c.result === 'PASS').length;
const caveats = scorecard.filter(c => c.result === 'PASS_WITH_CAVEAT').length;
const failed = scorecard.filter(c => c.result === 'FAIL').length;
```

Render segments **only when their count is > 0**, joined by ` · `:
```tsx
const segments = [
  passed > 0 && `${passed} passed`,
  caveats > 0 && `${caveats} with caveats`,
  failed > 0 && `${failed} failed`,
].filter(Boolean).join(' · ');
```

**Confirmed behavior:** when `caveats === 0`, the "with caveats" segment is **hidden entirely**, not shown as "0 with caveats". Same rule applies symmetrically to the "passed" and "failed" segments. Edge case: if all three are 0 (empty scorecard) the summary string is empty — fall back to the existing "no evaluation" copy already in the component (or hide the badge); the implementer should match the current empty-state behavior.

### 3d. Other render sites
After the `ScoreResult` type change, TypeScript will surface any other place that switches on PASS/FAIL. Update each to handle the third state. Expected scope is just `EvaluationCard.tsx` and `evalStatus.ts`, but the implementer must verify by running typecheck before claiming done.

## 4. Out of scope
- No changes to scoring logic, `overallResult` derivation, retry/sanity-check, AC grouping, improvedStory shape.
- No DB migration (jsonb stores the new enum value transparently).
- No changes to `story-agent` or `split-story`.

## 5. Diff preview
Per request: produce the patch in the next message and **wait for explicit approval before applying** any file edits.