## Problem

The chat shows two back-to-back confirmation gates:

1. After clarifications: *"Thanks for the clarifications! I'll now draft the description and acceptance criteria."* → [Looks good / Change something]
2. After the user clicks **Looks good**, the agent replies *"Here's the complete draft… Please review them."* → [Yes, looks good / I want to change something]
3. Quality evaluation auto-triggers anyway (because the user already said "Looks good" in step 2).

Step 2's message + chips are redundant: the user already approved, evaluation is already running, and the second set of chips is never used.

## Fix

When the user confirms at the criteria-confirmation gate (i.e. the response carries `awaitingCriteriaConfirmation` AND the user's last message matches the confirm intent), suppress the redundant AI bubble and its options, and go straight from the user's "Looks good" → `⏳ Running quality evaluation…` → `✅ Evaluation complete`.

The agent's behavior on the backend stays the same; this is a pure presentation change in `ChatPanel.tsx`.

## Technical details

In `src/components/ChatPanel.tsx` (around lines 220–290 in the response-handling block):

- Compute `isConfirm` BEFORE pushing the assistant message (currently it is computed only inside the `awaitingCriteriaConfirmation` branch, after `addMessage(aiMsg)` already ran).
- If `response.awaitingCriteriaConfirmation && isConfirm`:
  - Do NOT call `addMessage(aiMsg)` for that response, and do NOT persist it via `saveMessage`. (The "Here's the complete draft…" bubble disappears entirely.)
  - Proceed directly to the existing evaluation flow: push `⏳ Running quality evaluation…`, call `api.evaluateStory`, save the generated story, push `✅ Evaluation complete`.
- Otherwise (first time the gate appears, or user wants to change something), keep current behavior: show the assistant message with its option chips so the user can confirm or request changes.

No changes to `supabase/functions/story-agent/index.ts`, the API layer, or the storyDraft persistence — the draft on the right still updates because `setEvaluation` and `saveGeneratedStory` already use `response.storyDraft`.

## Files touched

- `src/components/ChatPanel.tsx` — reorder the `isConfirm` check and skip rendering the redundant assistant bubble when auto-evaluating.