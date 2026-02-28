

## Plan: Show Epic Name on Split Sub-Stories

The `metadata.epic` field already exists in `StoryMetadata` but isn't being populated or displayed. Two changes needed:

### Steps

1. **`supabase/functions/split-story/index.ts`** — Update the system prompt to instruct the AI to set each sub-story's `metadata.epic` field to the original epic's title

2. **`src/components/SplitStoriesView.tsx`** — Display the `metadata.epic` field in each story card (read-only badge or label below the title showing "Epic: {name}")

3. **`src/context/WizardContext.tsx`** — In `confirmSplitStories`, ensure the epic field is populated from the original story title if the AI didn't set it (fallback)

| File | Change |
|------|--------|
| `supabase/functions/split-story/index.ts` | Add prompt instruction to set `metadata.epic` to epic title |
| `src/components/SplitStoriesView.tsx` | Display epic name badge on each card |
| `src/context/WizardContext.tsx` | Fallback: set `metadata.epic` from original story title on confirm |

