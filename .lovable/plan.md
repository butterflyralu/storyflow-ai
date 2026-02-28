

## Plan: Epic Splitting Feature with Swipeable Story Cards

### UX Best Practices for Story Splitting

- **Progressive disclosure**: Show the split suggestions in-context rather than navigating away. The chat explains the rationale while the right panel shows the resulting cards.
- **Card carousel with visible neighbors**: Show partial edges of adjacent cards so users know there are more stories to swipe through. Use dots or a "2/5" counter for position awareness.
- **Preserve epic context**: Keep the original epic summary visible as a sticky header above the cards, so users always see the parent context.
- **One story at a time**: Let users focus on and edit one story card at a time (AC, title, etc.) before moving to the next — matches the "one thing at a time" principle.
- **Non-destructive**: Keep the original epic story accessible via a "Back to original" action. Splitting should feel like a suggestion, not a forced action.
- **Batch save vs. individual save**: Let users save all split stories at once or cherry-pick which ones to keep.

### Implementation Steps

1. **New edge function `supabase/functions/split-story/index.ts`**
   - Receives the current epic story + product context
   - System prompt instructs the AI to break the epic into 3-6 independent user stories, each with title/asA/iWant/soThat/description and empty AC
   - Returns `{ epicSummary: string, stories: StoryDraft[] }`

2. **Extend WizardContext state**
   - Add `splitStories: StoryDraft[]` and `activeSplitIndex: number` state
   - Add `epicSummary: string | null` to hold the parent epic context
   - Actions: `setSplitStories`, `setActiveSplitIndex`, `updateSplitStory`, `clearSplit`

3. **Add "Split Story" button to StoryPreview**
   - Appears conditionally when `evaluation?.isLikelyEpic` is true, next to the existing epic warning
   - On click: calls the split-story edge function, then populates `splitStories` in context

4. **New `SplitStoriesView` component** (replaces StoryPreview when in split mode)
   - **Sticky epic header**: Shows the original epic title and summary
   - **Embla carousel** (already installed: `embla-carousel-react`) for swipeable story cards
   - Each card is a mini version of StoryPreview (title, user story sentence, description, editable AC section)
   - Navigation: dot indicators + prev/next buttons + "3 of 5" label
   - Each card has inline-editable fields like the current StoryPreview

5. **Chat integration**
   - When split is triggered, send a chat message listing the suggested stories
   - User can discuss individual stories in chat (e.g., "make story 2 more specific")
   - The story agent receives the current split story as context

6. **Actions on split view**
   - "Save All Stories" button to batch-save
   - "Discard Split" to return to the original epic view
   - Per-card "Remove" to drop a suggested story

7. **Update `src/services/api.ts`**
   - Add `splitStory(input)` method calling the new edge function

8. **Update `src/services/types.ts`**
   - Add `SplitStoryRequest` and `SplitStoryResponse` types

### File Changes Summary

| File | Action |
|------|--------|
| `supabase/functions/split-story/index.ts` | Create |
| `src/services/types.ts` | Add split types |
| `src/services/api.ts` | Add `splitStory` method |
| `src/context/WizardContext.tsx` | Add split state + actions |
| `src/components/SplitStoriesView.tsx` | Create (carousel + cards) |
| `src/components/StoryPreview.tsx` | Add "Split Story" button |
| `src/components/Wizard.tsx` | Conditionally render SplitStoriesView |

