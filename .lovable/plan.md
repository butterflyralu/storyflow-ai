# Clarifying Questions Wizard (Inline in Chat)

Build an inline mini-wizard that runs the agent's clarification phase as a stepped card inside the chat thread, asking 4–6 questions one at a time when the story is complex (3 minimum, 6 maximum).

## Behavior

After the user provides a valid `soThat` and before AC drafting, the agent decides:
- **Simple story**: skip or ask 1–3 questions inline (existing behavior with option chips).
- **Complex story** (multi-step flow, multiple user types, integrations, edge cases, regulatory/security concerns): launch a **Clarification Wizard** with **4–6 questions** asked one at a time.

The agent signals "this is a wizard" by returning a new structured payload (see Technical). The chat panel then renders a wizard card instead of a regular message + chip list.

## Wizard UI (inside the chat thread)

A single sticky card appended to the chat that shows:
- Header: "Clarifying questions" + step counter `Step 2 of 5` + thin progress bar.
- Current question text.
- 2–4 option chips for the current question (when enumerable).
- A free-text input below the chips ("Or type your answer…") so the user can override.
- Footer buttons: `Skip this question` (secondary), `Skip all & draft` (ghost), `Back` (only after step 1).
- On Answer: card animates to next question; previous Q+A pair collapses into a compact summary line above.
- On Finish (last question answered, "Skip all", or agent decides it has enough): wizard collapses into a read-only summary block ("5 clarifications captured") and the agent posts its next normal chat message (User Type Coverage check or AC drafting).

The wizard card stays inside the normal chat scroll — it is NOT a modal. It looks like a richer assistant message.

```text
┌─ Clarifying questions ─────────── Step 2 of 5 ─┐
│ ████████░░░░░░░░░░░░                            │
│                                                 │
│ Should password reset use email link or OTP?    │
│                                                 │
│ [ Email link ]  [ OTP ]  [ Both ]               │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Or type your answer…                        │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ‹ Back        Skip this question   Skip & draft │
└─────────────────────────────────────────────────┘
```

## Technical changes

### 1. Edge function — `supabase/functions/story-agent/index.ts`

Update SYSTEM_PROMPT Phase 3:
- Decide complexity from the draft (multiple user types, integrations, async flows, compliance, >1 happy path).
- Simple → up to 3 inline questions using existing `options` mechanism.
- Complex → emit a `clarificationWizard` payload with a planned set of 4–6 questions.

Extend the `respond_to_user` tool schema with one new optional field:

```ts
clarificationWizard: {
  type: "object",
  properties: {
    questions: {
      type: "array",         // 4–6 items when used
      items: {
        type: "object",
        properties: {
          id: { type: "string" },           // stable id for answer lookup
          question: { type: "string" },
          options: {                         // 0–4 chips, optional
            type: "array",
            items: { type: "object", properties: { label: { type: "string" } }, required: ["label"], additionalProperties: false }
          },
          allowFreeText: { type: "boolean" } // default true
        },
        required: ["id", "question"],
        additionalProperties: false
      }
    }
  },
  required: ["questions"],
  additionalProperties: false
}
```

When the wizard finishes, the frontend sends a single user message back containing all Q&A pairs as structured text (e.g. `Clarifications:\n- Q: …\n  A: …`). The agent then proceeds to Phase 3b / drafting and does NOT emit another wizard.

### 2. Frontend — chat rendering

- Extend `UIChatMessage` (in `src/types/wizard.ts`) with optional `wizard?: { questions: Question[] }` and a `wizardState?: { answers: Record<string, string>, currentIndex: number, completed: boolean }` for in-progress UI state.
- New component `src/components/ClarificationWizard.tsx`:
  - Receives the questions array + an `onComplete(answers)` callback.
  - Manages step index, answers, Back/Skip/Skip-all locally.
  - Renders chips + free-text input + footer controls per the mock above.
  - On complete, calls `sendMessage` with the formatted Q&A summary.
- Update `src/components/ChatPanel.tsx`:
  - When the agent response includes `clarificationWizard`, push a single message with `wizard` populated instead of message + options.
  - In the message renderer, if `msg.wizard` is set and not yet completed, render `<ClarificationWizard />`. If completed, render the compact summary block.

### 3. Persistence

- `chat_messages.options` is already `jsonb`. Store the wizard payload there under a `wizard` key (or extend `options` shape) so reloads restore the wizard. Completed wizards persist their summary as the user-message turn that was already sent — no schema change needed.

## Out of scope

- Branching wizards (questions that depend on previous answers beyond what the agent already plans).
- Saving clarifications as a separate analytics object — they live in chat history.
- Changing the AC drafting or evaluation phases.
