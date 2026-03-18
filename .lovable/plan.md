

## Plan: Move New Story / New Epic Buttons to the Top Bar

### Change

Add "New Story" and "New Epic" buttons to the header bar (lines 57–85 of `Wizard.tsx`) so they're always visible regardless of sidebar state.

### Layout

```text
[≡] [Logo] StoryFlow AI                    [+ New Story] [+ New Epic]  [AI Story Assistant] [user] [logout]
```

- **"+ New Story"**: Primary variant (`variant="default"`), compact size, with `Plus` icon. Visible when a product context is selected (`contextId` exists).
- **"+ New Epic"**: Outline variant (`variant="outline"`), compact size, with `Layers` icon. Also gated on `contextId`.
- On mobile: show icon-only versions (no label text).

### Implementation

**`src/components/Wizard.tsx`** — Only file changed for this specific task:
- Pull `contextId` from `useWizard()` (already destructured on line 20)
- Add `setChatHistory`, `setDbSessionId`, `setStory`, `setEvaluation` from wizard context for "New Story" handler
- Add the two buttons in the header between the logo area and the user area (line 68 region)
- "New Story" handler: clears chat, story, evaluation, sets step to 2 (same as current `handleNewSession` in sidebar)
- "New Epic" handler: opens a small dialog to create an epic (title input + save) using `useStorySaver`'s epic creation method

**`src/components/AppSidebar.tsx`** — Remove the "New Session" button from the sessions header (since it moves to the top bar). The prominent buttons in the sidebar from the previous plan are no longer needed there.

### Files Changed

| File | Change |
|------|--------|
| `src/components/Wizard.tsx` | Add New Story + New Epic buttons to header |
| `src/components/AppSidebar.tsx` | Remove redundant New Session button from sidebar |

