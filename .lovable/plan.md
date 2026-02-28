

## Plan: Remove Separate Evaluation Step, Show Inline in Story Preview

**Goal**: Eliminate step 3 as a separate view. After evaluation triggers, stay on the same Chat + StoryPreview layout but show inline annotations on failed criteria directly in the story card, plus a small action bar.

### Changes

1. **`StoryPreview.tsx`** — Read `evaluation` from `useWizard()`. After each section (title, user story, description, acceptance criteria), render any matching FAIL items as a subtle inline annotation (small amber/orange left-border bar with criterion + explanation text). Add a criteria-to-field mapping function. At the bottom, show a compact action bar (Accept Improved / Keep Original) when evaluation is present.

2. **`Wizard.tsx`** — Remove the `step === 3` block entirely. Change `step === 2` to render for both steps 2 and 3 (same Chat + StoryPreview layout). The StoryPreview handles showing evaluation inline.

3. **`StepIndicator.tsx`** — Remove the "Evaluate" step. Steps become: Context (1), Draft (2), Finalize (3). Update numbering.

4. **`ChatPanel.tsx`** — Update evaluation auto-trigger to NOT advance to step 3. Instead just call `setEvaluation()` and stay on step 2. Add a chat message like "Evaluation complete — check the annotations in your story draft."

5. **`WizardContext.tsx`** — Update `WizardStep` type from `1|2|3|4` to `1|2|3`. Adjust `resetStory` to set step 2.

6. **`EvaluationCard.tsx`** — Can be removed or kept only for the action buttons embedded in StoryPreview.

### Criteria-to-field mapping
- "Valuable" / "Value" → `soThat`
- "Testable" → `acceptanceCriteria`
- "Small" / "Sized" → title area
- "Specific" / "Independent" / "Negotiable" → `description`
- "Estimable" → user story block
- Unmatched → bottom of card

### Inline annotation style
```text
┌─ amber-left-border ──────────────────┐
│ ⚠ Testable: Criteria lack measurable │
│   outcomes to verify completion.     │
└──────────────────────────────────────┘
```
Small, `text-xs`, `border-l-2 border-amber-400 bg-amber-50/50 pl-2 py-1` styling.

