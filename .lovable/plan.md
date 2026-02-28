

## Plan: Chat-First Epic Splitting Flow

### Problem
Currently, clicking "Split Story" immediately generates cards in the right panel. The user has no chance to discuss, filter, or adjust which stories to keep before they appear. Chat commands like "only keep 3 of the 5" are ignored because the story agent doesn't know about split stories.

### New Flow

1. **Split button calls API** → results go to chat only (not to right panel yet)
2. **Chat lists proposed stories** as a numbered list, asks user which to keep
3. **User discusses** in chat (e.g., "drop stories 2 and 4", "merge 1 and 3")
4. **Chat confirms final selection** → only then populates cards in right panel
5. User swipes through confirmed cards, adds AC, etc.

### Implementation Steps

1. **Change split button behavior in `StoryPreview.tsx`**
   - Instead of calling `setSplitStories()` immediately, store the API result temporarily in a new state `pendingSplitStories` in WizardContext
   - Chat message lists proposed stories and asks which to keep
   - Add options like "Keep all", "Let me choose"

2. **Add `pendingSplitStories` to `WizardContext.tsx`**
   - New state: `pendingSplitStories: StoryDraft[]` — holds AI suggestions before user confirms
   - New action: `confirmSplitStories(indices: number[])` — moves selected stories from pending to `splitStories` and shows cards
   - New action: `clearPendingSplit()` — discards pending suggestions

3. **Update `story-agent` system prompt** (`supabase/functions/story-agent/index.ts`)
   - Add instructions: when `pendingSplitStories` is present in the draft context, the agent should help the user decide which stories to keep/drop/merge
   - Agent can understand commands like "keep 1, 3, 5", "drop story 2", "merge stories 1 and 3"
   - When user confirms selection, agent returns a `confirmSplit` flag with the selected indices

4. **Update `ChatPanel.tsx`** to handle split confirmation
   - When agent response includes `confirmSplit` with indices, call `confirmSplitStories(indices)` to move selected stories to the right panel
   - Pass `pendingSplitStories` as additional context to the story agent API call

5. **Update story-agent tool definition** (`supabase/functions/story-agent/index.ts`)
   - Add `confirmSplit` (optional array of indices) to the `update_story` tool response schema
   - When the agent decides the user has confirmed their selection, it returns the indices

### File Changes

| File | Change |
|------|--------|
| `src/context/WizardContext.tsx` | Add `pendingSplitStories`, `confirmSplitStories`, `clearPendingSplit` |
| `src/components/StoryPreview.tsx` | Split button stores to `pendingSplitStories` instead of `splitStories` |
| `src/components/ChatPanel.tsx` | Pass `pendingSplitStories` to agent, handle `confirmSplit` response |
| `supabase/functions/story-agent/index.ts` | Add split discussion instructions + `confirmSplit` field to tool schema |
| `src/services/types.ts` | Add `confirmSplit` to `StoryAgentResponse` |

