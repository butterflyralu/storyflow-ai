

# UX Audit — StoryFlow AI MVP Pilot Readiness

## Current State Summary

StoryFlow AI is a chat-driven user story drafting tool with product context setup, AI-powered story generation, evaluation, epic splitting, and session management. The core flow is: **Auth → Context Wizard → Chat + Story Preview → Evaluate → Split (optional) → Save**.

---

## UX Issues & Improvements

### 1. Mobile Responsiveness is Broken

**Problem:** The main workspace (step 2) uses a 50/50 horizontal split (`w-1/2`) that is unusable on mobile (current viewport is 393px). Chat and story panels are cramped to ~196px each.

**Fix:** Replace the side-by-side layout with a tabbed view on mobile (Chat | Story tabs), keeping the split on desktop. This is critical for pilot users on phones/tablets.

---

### 2. No Onboarding or Empty State Guidance

**Problem:** New users land on the context wizard with no explanation of what the tool does or why they should fill in all those fields. The 3-step wizard asks for 11 fields including strategic concepts (North Star, Strategy) that may confuse non-PO users.

**Fix:**
- Add a brief welcome banner on step 1 explaining the tool's value ("Draft production-ready user stories with AI — start by describing your product").
- Mark optional fields visibly (strategy, objectives, north star) so users can skip them and get started faster.
- Add tooltips or help text on jargon-heavy fields (North Star, AC Format).

---

### 3. No Way to Delete or Switch Product Contexts

**Problem:** Users can only edit the current context or create a new one via the wizard. There's no context switcher in the sidebar and no way to delete old contexts. For a pilot with multiple products, this is a blocker.

**Fix:** Add a context selector dropdown in the sidebar header showing saved contexts, with options to switch or create new.

---

### 4. Chat Input Lacks Multiline Support and Keyboard Shortcuts

**Problem:** The chat input is a single-line `<input>` element. Users drafting detailed story requests can't see what they're typing. No Shift+Enter for newlines, no Cmd+Enter to send.

**Fix:** Replace with a `<textarea>` that auto-grows (max ~4 lines), supports Shift+Enter for newlines and Enter to send.

---

### 5. No Loading/Progress Feedback During Story Generation

**Problem:** When the AI is generating a story, the only indicator is a small spinner in the chat. Users don't know if it will take 3 seconds or 30. The story panel shows stale content until the response arrives.

**Fix:** Add a subtle "Generating story..." skeleton or pulse animation on the story preview panel while the AI is responding.

---

### 6. Story Preview is Empty Until AI Responds

**Problem:** When starting a new session, the right panel shows an empty story card with "Not yet defined..." placeholders. It's unclear what will happen there.

**Fix:** Show an empty state illustration or message: "Your story will appear here as you chat with the AI."

---

### 7. No Confirmation Before Destructive Actions

**Problem:** "Discard Split" and "Start a new story" happen instantly with no confirmation. Users could lose unsaved work.

**Fix:** Add confirmation dialogs for: discard split, starting a new story (if current story has content), and removing a split story card.

---

### 8. Copy for Jira Outputs Plain Text Only

**Problem:** The "Copy for Jira" button generates plain text. Jira supports markdown and structured fields. Users will need to manually reformat.

**Fix:** Offer two copy options: "Copy as Markdown" (Jira-compatible) and "Copy as Plain Text". Consider adding a direct Jira/CSV export for the pilot.

---

### 9. Session Sidebar Lacks Search and Delete

**Problem:** Sessions list grows unbounded with no search, filter, or delete capability. Old sessions clutter the sidebar.

**Fix:** Add a search/filter input at the top of sessions list, and a delete action (swipe or icon) per session with confirmation.

---

### 10. No Visual Distinction Between Draft and Evaluated Stories

**Problem:** A story that has been evaluated and one that hasn't look identical in the sidebar and story preview (aside from the small badge). Users can't quickly see which stories are "done."

**Fix:** Add a visual status indicator (colored dot or icon) to session items in the sidebar showing: draft, evaluated-pass, evaluated-fail.

---

### 11. Error Handling is Generic

**Problem:** API errors show raw messages like "Something went wrong. Please try again." or the raw error string from the edge function. Not actionable.

**Fix:** Map common errors to user-friendly messages (rate limit, network offline, auth expired) with specific recovery actions.

---

### 12. No Dark Mode Toggle

**Problem:** The app appears to support dark mode via Tailwind classes but there's no toggle for users to switch. Pilot users may want this.

**Fix:** Add a theme toggle (light/dark/system) in the header or sidebar footer.

---

## Priority for MVP Pilot

| Priority | Improvement | Impact |
|----------|------------|--------|
| **P0** | Mobile responsive layout (tabbed view) | Pilot users on mobile can't use the app |
| **P0** | Empty state for story preview | Reduces confusion for new users |
| **P0** | Confirmation dialogs for destructive actions | Prevents data loss |
| **P1** | Multiline chat input with keyboard shortcuts | Daily usability |
| **P1** | Context switcher in sidebar | Multi-product pilots |
| **P1** | Session search and delete | Session management at scale |
| **P1** | Loading skeleton on story panel | Reduces perceived wait time |
| **P2** | Onboarding guidance and optional field marking | First-time experience |
| **P2** | Better Jira export (markdown) | Workflow integration |
| **P2** | Story status indicators in sidebar | At-a-glance progress |
| **P2** | Improved error messages | Trust and recovery |
| **P3** | Dark mode toggle | User preference |

---

## Implementation Approach

All changes are frontend-only except session delete (requires a database call). The mobile layout change is the largest effort — converting the split view to tabs using the existing `Tabs` component. Most other items are small, isolated changes (1-2 files each).

Estimated total: ~12-15 focused implementation steps.

