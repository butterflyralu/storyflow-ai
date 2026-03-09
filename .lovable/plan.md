
Goal: make chat and User Story panel scroll independently so the right panel no longer moves when chat scrolls/auto-scrolls.

1) Root cause (from current layout)
- Step 2 has nested scroll regions:
  - Left: `ChatPanel` (`ScrollArea`)
  - Right: container itself has `overflow-y-auto`
  - Inside right: `StoryPreview` also has `CardContent overflow-y-auto`
- This creates scroll chaining and “linked” movement (especially with wheel momentum + `scrollIntoView` in chat).

2) Layout isolation changes (UI only, no backend/db)
- File: `src/components/Wizard.tsx`
- In step 2 split layout:
  - Keep the split container as a fixed-height flex region (`h-full min-h-0 overflow-hidden`).
  - Left panel: keep `overflow-hidden min-h-0`.
  - Right panel: change from `overflow-y-auto` to `overflow-hidden min-h-0` so it is NOT an independent outer scroller.
  - Wrap non-split preview in a full-height padded container (not sticky) so only inner StoryPreview content scrolls.
- Also harden top-level shell from `min-h-screen` to `h-screen overflow-hidden` so document/page scroll does not participate.

3) Prevent scroll chaining explicitly
- File: `src/components/ChatPanel.tsx`
  - Add `overscroll-y-contain` to chat scroll region (and/or chat root).
- File: `src/components/StoryPreview.tsx`
  - Keep `CardContent` as the single right-side scroll surface and add `overscroll-y-contain`.
- Result: wheel/touch scroll energy won’t propagate from chat into sibling/potential parent containers.

4) Keep split-story mode behavior stable
- File: `src/components/SplitStoriesView.tsx`
  - Verify container remains `h-full flex-col`.
  - Ensure only card bodies scroll (`CardContent overflow-y-auto`) and outer split view remains `overflow-hidden`.
  - No functional logic changes.

5) Verification checklist (manual)
- In step 2 (single story):
  - Scroll chat rapidly: right story panel must stay visually fixed.
  - Scroll story content: chat should not move.
  - Send messages (auto-scroll): right panel should not jump.
- In split view:
  - Carousel navigation + per-card scrolling still works.
  - Save/discard bars remain visible and stable.
- Test on desktop + one mobile viewport to confirm no regression.

Implementation scope summary:
- Frontend class/layout adjustments only.
- No API, auth, database, or migration changes required.
