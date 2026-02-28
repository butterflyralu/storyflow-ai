# PO Agent — Implementation Plan
**Status:** Draft | February 2026
**Builder:** Raluca (solo, low-code)
**Stack:** Lovable (React UI) + n8n Cloud (orchestration) + Google Sheets (storage) + OpenRouter (unified LLM API)

---

## Context

Building a multi-agent AI pipeline from scratch that takes Product Owners from unstructured ideas to evaluator-approved user stories. The system consists of 5 agents, 2 entry flows (Epic and Story), and an embedded learning/evaluation layer. All built low-code: Lovable for the frontend, n8n for agent orchestration, Google Sheets for persistence.

---

## Phase 0 — Infrastructure Setup (Day 1, ~2 hrs)

### 0.1 Google Sheets
Create a single Google Sheets workbook with two sheets:

| Sheet | Columns |
|-------|---------|
| `ProductContext` | `contextId`, `mission`, `northStar`, `persona`, `strategy`, `objectives`, `lastUpdated` |
| `CustomerChecklist` | `contextId`, `ruleId`, `ruleText`, `createdAt`, `active` |

- Share the sheet with a Google Service Account (JSON key)
- Note the Sheet ID for n8n

### 0.2 OpenRouter
- Create account at openrouter.ai
- Generate API key
- Models to use via OpenRouter:
  - Agent 1: `openai/gpt-4o`
  - Router: `openai/gpt-4o-mini`
  - Agent 2a + 2b: `anthropic/claude-sonnet-4-5` (or latest Claude Sonnet)
  - Agent 3: `openai/gpt-4o-mini`
- Base URL for n8n HTTP nodes: `https://openrouter.ai/api/v1/chat/completions`

### 0.3 n8n Cloud
- Create new n8n cloud workspace
- Add credentials:
  - OpenRouter: HTTP Header Auth (`Authorization: Bearer <key>`)
  - Google Sheets: Service Account JSON
- **`contextId` guard (add as first node in every workflow except `/save-context` and `/validate-context`):**
  ```
  IF contextId is missing or empty →
    Return: { error: "missing_context", message: "Please complete Product Context setup first." } (HTTP 400)
  ELSE → continue
  ```
  Lovable: if any webhook returns `error: "missing_context"` → show inline banner with "Set up now →" link to Page 1
- **CORS configuration (required for all webhooks):** every n8n workflow must end with a "Respond to Webhook" node that sets:
  ```
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, OPTIONS
  Access-Control-Allow-Headers: Content-Type
  ```
- Create a dedicated OPTIONS preflight handler workflow: any OPTIONS request to any webhook path returns 200 with the above headers and an empty body
- Set up a test workflow to verify both connections and CORS headers

### 0.4 Lovable
- Create new Lovable project: "PO Agent"
- Apply brand tokens globally (see UI Spec §1):
  - Primary Navy: `#1A2B4A`
  - Accent Red: `#E63329`
  - Accent Blue: `#00AEEF`
  - Font: Poppins Italic (headings) + Open Sans (body)

---

## Phase 1 — Agent 1: Context Setup (Days 2-3, ~4 hrs)

**Goal:** Working Page 1 that validates and saves 5 product context fields.

### 1.1 n8n: `/validate-context` Webhook
**Trigger:** POST `{ field, value, allContext }`
**Logic:**
1. HTTP Request to OpenRouter (GPT-4o)
2. System prompt: "You are a Strategic Alignment Auditor. Validate the field '{field}' with value '{value}'. Return JSON: `{ pass: bool, reason: string }`"
3. Per-field validation rules (from Architecture §3.2):
   - Mission: must be specific, not generic
   - North Star: must be measurable and time-bound
   - Persona: must include behavioural context
   - Strategy: must be directional, not a feature list
   - Objectives: must be specific and linked to strategy
4. Return `{ pass: bool, reason: string }`

### 1.2 n8n: `/save-context` Webhook — first-time only
**Trigger:** POST `{ mission, northStar, persona, strategy, objectives }`
**Logic:**
1. Generate `contextId` (UUID)
2. Insert new row to Google Sheets `ProductContext`
3. Return `{ contextId }`
4. Lovable stores `contextId` in `localStorage`

### 1.2b n8n: `/update-context` Webhook — returning users
**Trigger:** POST `{ contextId, mission, northStar, persona, strategy, objectives }`
**Logic:**
1. Find existing row in `ProductContext` where `contextId` matches
2. Update row in place (same `contextId` preserved — checklist history intact)
3. Update `lastUpdated` timestamp
4. Return `{ success: true }`

**Lovable decides which to call:**
- No `contextId` in `localStorage` → `/save-context`
- `contextId` exists in `localStorage` → `/update-context`

### 1.3 n8n: `/get-context` Webhook
**Trigger:** GET `?contextId={id}`
**Logic:** Read row from `ProductContext` where contextId matches → return all fields

### 1.4 Lovable: Page 1 — Product Context Setup
- Single column, max-width 680px, centred
- Sequential card reveal (next card appears after current validates)
- Each field card:
  - Label (Poppins Italic, navy, uppercase)
  - Helper text (Open Sans 13px, grey)
  - Textarea (3-row min, expandable)
  - Red pill "Validate →" button → calls `/validate-context`
  - Loading state: spinner in button
  - Pass: green checkmark badge, field read-only
  - Fail: red border + error message
- Returning user banner: "Context last updated [date]. Review or Skip?"
- All 5 validated: navy "Product context saved" banner + "Go to Story Creation →" red CTA → calls `/save-context` → stores `contextId` in **localStorage** (persists across sessions)
- On load: check `localStorage` for `contextId` → if found, call `/get-context` → if row exists in Sheets → show "Returning user" banner → if not found or Sheets returns nothing → show fresh setup flow

---

## Phase 2 — Router + Entry Choice (Day 4, ~2 hrs)

**Goal:** Router backend + entry tiles embedded inside the chat UI (no separate page).

### 2.1 n8n: `/router` Webhook
**Trigger:** POST `{ message, contextId, trigger: 'entry' | 'post-eval' }`
**Logic:**
1. HTTP Request to OpenRouter (GPT-4o-mini)
2. System prompt: "Classify whether this input describes an Epic (multiple stories, broad scope) or a Story (single user interaction). Return JSON: `{ classification: 'epic' | 'story', confidence: 'high' | 'low', reason: string }`"
3. If confidence is low → return mismatch flag
4. Return `{ route: 'epic' | 'story', mismatch: bool, mismatchMessage: string }`

### 2.2 Lovable: Entry Choice — embedded in Chat UI (not a separate page)
After Page 1 completes, the user lands directly on the Chat page. The chat opens with an agent greeting + 2 entry tiles rendered as option cards in the chat stream:

```
┌─────────────────────────────────────────────────────┐
│ 👋 Hi! I'm here to help you write better stories.   │
│ What are you starting with today?                   │
│                                                     │
│  ┌────────────────────┐  ┌────────────────────┐    │
│  │  📚 An Epic        │  │  📄 A Story        │    │
│  │  Define a feature  │  │  Write a single    │    │
│  │  and split it into │  │  user story        │    │
│  │  stories           │  │  directly          │    │
│  └────────────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**Tile selection:**
- Clicking "A Story" → Router runs silently → right panel switches to Story Preview → Agent 2b takes over the chat
- Clicking "An Epic" → **no Router call** — agent replies inline in chat: *"Epic mode is coming soon! For now, describe your story directly and I'll help you structure it."* → Agent 2b takes over the conversation

**Free text input:**
- If user types instead of clicking → Router classifies → if mismatch, agent replies in chat: "This sounds like it could be multiple stories — want to explore that as an Epic first?" with [Yes] / [No] reply tiles

**Right panel on arrival (before tile selection):**
- Empty state: "Your story or epic summary will appear here as we work" — light grey placeholder text, centred

---

## Phase 3 — Agent 2b: Story Flow (Days 5-7, ~6 hrs)

**Goal:** End-to-end "direct story → draft" path working. Highest value, lower complexity than Epic.

### 3.1 n8n: `/story-agent` Webhook
**Trigger:** POST `{ message, sessionId, contextId, agentContext, history }`
- `agentContext` is fetched once by Lovable on chat page load (via `/get-context`) and passed in every call — n8n does NOT re-fetch from Sheets on each message
**Logic:**
1. Build conversation history from `history` array
3. System prompt for Agent 2b (Claude Sonnet via OpenRouter):

   **Source:** Adapted from the existing `user-stories` Claude skill. Carry over directly:
   - Story format: `As a [persona], I want [goal] so that [benefit].` + Description (2-3 sentences) + Acceptance Criteria in 3-6 named categories using bullet points (not numbered lists)
   - AC quality rules: specific, testable, unambiguous. Cover edge cases, error states, non-functional criteria where relevant.
   - Sequencing rules: NEVER ask for epic/category until AC are finalised. Priority + estimate collected AFTER story content confirmed.
   - Exception: if user can't answer a question, provide a best-guess and ask for correction rather than blocking.

   **PO Agent additions on top of the skill:**
   - Role identity: "Requirements Scribe" — structured, precise, efficient
   - Inject persona, mission, strategy from Agent 1 context at the top of every call — NEVER re-ask
   - Ask clarifying questions as structured options (quiz tiles, rendered by Lovable) — last option always "Tell me more"
   - Gate: explicitly ask user to confirm AC completeness before submission. Non-negotiable. Re-prompt if not confirmed.
   - Story title: auto-generate from the "I want" statement (reused from skill Step 5)
   - Batch mode (when called from Epic flow): fully complete one story before moving to next — same rule as skill batch mode

4. Return full response (no streaming for MVP) using this standard envelope — always:
```json
{
  "message": "...",
  "options": [{ "label": "..." }] | null,
  "awaitingCriteriaConfirmation": false | true
}
```
- `options: null` → Lovable renders plain agent bubble
- `options: [...]` → Lovable renders quiz tiles below the bubble
- "✏️ Tell me more" is **always appended by Lovable** as the last tile — agent does not include it
- `awaitingCriteriaConfirmation: true` → Lovable renders AC-specific confirmation tiles: `["Yes, looks good", "I want to change something"]`
- n8n instructs the LLM to return structured JSON in this format (structured output prompt)

### 3.2 Lovable: Page 3b — Story Creation
**Left panel (45%) — Chat:**
- Agent bubbles: left-aligned, grey bg, Open Sans 14px
- User bubbles: right-aligned, navy bg, white text
- Typing indicator: three animated dots
- Quiz option cards below agent message (2-column grid):
  - White bg, navy border, 8px radius
  - Hover: navy bg/white text
  - Selected: red bg/white text
  - Last card always: "✏️ Tell me more" → opens free text input (appended by Lovable, not agent)
  - After selection: cards collapse, choice appears in user bubble
  - **Keyboard support:** tiles are numbered (1, 2, 3…) — pressing the number key selects that tile instantly. "Tell me more" is always the last number. Tab/arrow keys also cycle through tiles. Enter confirms focused tile.

**Right panel (55%) — two tabs: "Story" | "Evaluation"**

*Story tab (active during conversation):*
- Header: "Story Preview" Poppins Italic + version badge "v1"
- Story card sections: As a / I want / So that / Description / Acceptance Criteria / Metadata
- Click any section to edit → blue outline → auto-save after 2 sec
- Acceptance criteria grouped by category with category headers
- Metadata row: Project | Epic | Priority | Estimate (inline edit, appears after AC confirmed)
- Version history: collapsible section, each version as collapsed card + "Restore"
- **No "Send to Evaluator" button** — evaluation is triggered automatically when PO confirms AC

*Evaluation tab (switches automatically on AC confirmation):*
- See Phase 4 for full spec

**AC confirmation = evaluation trigger:**
- Agent proposes AC → `awaitingCriteriaConfirmation: true` flag in response → UI shows confirmation tiles in chat
- PO clicks "Yes, looks good" → UI immediately:
  1. Calls `/evaluate` with current story draft
  2. Switches right panel tab to "Evaluation"
  3. Shows spinner: "Evaluating your story..."

**State management (React):**
- `contextId`: loaded from `localStorage` on app init — used in all webhook calls
- `agentContext`: fetched once via `/get-context` on chat page load → passed in every `/story-agent` and `/evaluate` call payload (no per-message Sheets reads)
- `sessionId`: UUID generated on page load (in-session only, not persisted)
- `conversationHistory`: array of `{ role, content }` pairs
- `storyDraft`: current story object with all sections
- `awaitingCriteriaConfirmation`: bool flag
- `storyVersion`: increments on each regeneration
- `rightPanelTab`: `'story' | 'evaluation'` — switches to `'evaluation'` on AC confirmation
- `evaluationResult`: stores full `/evaluate` response
- `iterationCount`: starts at 0, increments each time `/evaluate` is called — shown as "Iteration N" in UI, no hard limit for MVP

---

## Phase 4 — Agent 3: Evaluator (Days 8-9, ~5 hrs)

**Goal:** Auto-evaluation flow with scorecard, learning insight, and improved story.

### 4.1 n8n: `/evaluate` Webhook
**Trigger:** POST `{ story, sessionId, contextId }`
**Logic:**
1. Fetch Agent 1 context + customer checklist from Google Sheets
2. HTTP Request to OpenRouter (GPT-4o-mini):
   - Evaluate against INVEST (6 criteria) + DoR checklist (hardcoded below) + customer checklist
   - **DoR criteria (fixed, in every evaluation):**
     1. Persona is clearly identified
     2. Business value / "so that" is stated
     3. All acceptance criteria are specific and testable (no subjective language)
     4. No unresolved external dependencies blocking development
     5. Story is estimated or estimable without further information
     6. No open questions that would block a developer from starting
     7. Design is defined and provided, or explicitly confirmed as not required for this story
   - Return JSON:
     ```json
     {
       "scorecard": [{ "criterion": "", "result": "PASS|FAIL", "explanation": "" }],
       "overallResult": "PASS|FAIL",
       "improvedStory": { ...storyObject },
       "learningInsight": { "observation": "", "question": "", "suggestion": "" },
       "newChecklistRule": null | { "rule": "" },
       "isLikelyEpic": bool
     }
     ```
3. If `isLikelyEpic` (4+ INVEST failures): add flag to response
4. Return full evaluation object

### 4.2 n8n: `/get-checklist` Webhook
**Trigger:** GET `?contextId={id}`
Return all active rules for contextId from `CustomerChecklist` sheet

### 4.3 n8n: `/save-checklist-item` Webhook
**Trigger:** POST `{ contextId, rule }`
Append new row to `CustomerChecklist` sheet → return `{ ruleId }`

### 4.4 Lovable: Evaluation — inline in right panel (Option A, no page change)

**Trigger:** PO clicks "Yes, looks good" on AC confirmation tiles → `/evaluate` fires → right panel tab switches to "Evaluation" automatically.

**Right panel — Evaluation tab:**

*Loading state:*
- Spinner centred in panel: "Evaluating your story..."

*Results appear progressively:*

1. **Status badge on tab label** — "✗ Needs Revision" or "✓ Approved" (red/green)

2. **Scorecard (cards fade in one by one):**
   - INVEST section: 6 criterion cards — PASS/FAIL badge + one-sentence explanation + coloured left border (green/red)
   - DoR section: same card style
   - Customer Rules section: shown only if checklist has items

3. **Improved story diff** (appears after step 2 loads):
   - Side-by-side: original left, improved right
   - Changed sections highlighted yellow
   - Iteration counter: "Iteration 1 of 3"

**Left panel — chat continues:**

After evaluation loads, the learning insight arrives as an agent message in chat:
```
💡 One thing to consider
[observation] — I've added a suggestion.
Does this match your intent?

[ Yes, that's right ] [ No, remove it ] [ Let me modify it ]
```
- PO must respond via tiles — improved story diff is visible but action buttons are locked until response
- **"Yes, that's right"** → action buttons unlock in right panel
- **"No, remove it"** → agent removes the suggested change, diff updates, action buttons unlock
- **"Let me modify it"** → free-text input opens below the tile (same pattern as "Tell me more"). PO types what to change → sent to n8n with `modifyingInsight: true` flag → agent re-generates only the affected section → right panel diff updates → action buttons unlock
- On any response: "Accept Improved Version" (navy) + "Keep Original" (ghost) + "Edit Further" (link) unlock in right panel

**Checklist growth moment** (if `newChecklistRule` detected):
- Appears as an agent message in chat immediately after the insight response:
  "I noticed a pattern worth saving: '[rule]'. Add to your checklist?"
  - [Yes, save it] [No thanks] tiles
  - On "Yes": `/save-checklist-item` called → rule saved to Google Sheets → appears in checklist drawer with toast "Rule saved ✓"

**"Edit Further" flow:**
- Right panel tab switches back to "Story" view
- Chat continues with Agent 2b, full `conversationHistory` preserved — no page navigation
- `awaitingCriteriaConfirmation` resets to `false`, `storyVersion` increments
- Next AC confirmation triggers a new `/evaluate` call — `iterationCount` increments
- **No hard iteration limit for MVP** — show "Iteration N" as information only, never block. Revisit after testing.

**"Accept Improved Version" flow:**
- `storyDraft` updated with improved story content
- "Copy Story" + "Export as Markdown" become available in right panel
- *(Router post-eval re-run deferred to post-MVP together with Phase 5 Epic flow)*

**Checklist accessible via:**
- Nav bar checklist icon (drawer) — same as rest of app. No inline checklist column needed since evaluation is in the right panel.

---

## Phase 5 — Agent 2a: Epic Flow [POST-MVP — DO NOT BUILD YET]

> Kept for future reference and refinement. Out of scope for the current MVP. The Router webhook (`/router`) is still built in Phase 2 since it's needed for the entry tile — but Agent 2a and the Epic UI are deferred.

## Phase 5 — Agent 2a: Epic Flow (Days 10-12, ~6 hrs)

**Goal:** Two-panel Epic flow with complexity-calibrated questioning and story split cards.

### 5.1 n8n: `/epic-agent` Webhook
**Trigger:** POST `{ message, sessionId, contextId, history }`
**Logic:**
1. Fetch Agent 1 context
2. System prompt for Agent 2a (Claude Sonnet):
   - Role: "Product Thinking Partner" — inquisitive, challenging, supportive
   - Domain calibration from context signals:
     - Regulated domain → deep track (compliance, audit, failure modes)
     - Well-known pattern (login, search, CRUD) → fast track immediately
     - Novel feature in complex domain → deep track
     - Simple SaaS → fast track (1-2 questions max)
   - Surface blind spots: edge cases, error handling, dependencies, personas, scope boundaries
   - When sufficient context: propose story split with explicit reasoning per story
   - Flag assumptions explicitly on relevant story cards
   - Exception: if PO removes all stories → "What's the smallest slice of value we could deliver?"
   - **Batch handoff to Agent 2b:** once split confirmed, each story card is processed through Agent 2b
     one at a time (same batch mode rule from the `user-stories` skill — fully complete one before next)
3. Detect when agent proposes story split → set flag in response: `proposingSplit: true, stories: [...]`
4. Return `{ message, proposingSplit, stories, flaggedAssumptions }`

### 5.2 Lovable: Page 3a — Epic Flow
**Left panel (45%) — Epic Chat:**
- Same chat bubble design as Story chat
- Quiz option cards (same spec as Page 3b)

**Right panel (55%) — Epic Summary + Story Split:**

*During questioning phase:*
- Epic summary builds live as user answers:
  - Structured card: Goal / Scope / Personas / Out of Scope
  - Editable inline — user can click any field to correct

*Story split proposal (when `proposingSplit: true`):*
- Each story rendered as a vertical card list
- Card: story title (Poppins Italic) + one-line summary + agent reasoning (grey italic)
- Flagged assumptions: blue info tags on relevant cards
- PO actions:
  - Drag to reorder
  - Click × to remove
  - Click "+ Add story" to add custom story
- "Confirm Split →" red button — disabled until ≥ 2 stories present
- On confirm: navigate to Story Board view, pass story list to state

---

## Phase 6 — Story Board [POST-MVP — DO NOT BUILD YET]

> Kept for future reference. Depends on Phase 5 (Epic flow) being complete. Out of scope for MVP.

## Phase 6 — Story Board (Day 13, ~3 hrs)

**Goal:** Story Board page + mini-sidebar in Story flow.

### 6.1 Lovable: Story Board Mini-Sidebar (Page 3b)
- 200px left edge panel (Epic flow only, hidden in direct Story flow)
- Stories listed vertically: title + status dot (grey/blue/green)
- Active story: red left border highlight
- Clicking completed story: opens read-only preview
- "View all stories" link → navigates to full Story Board page

### 6.2 Lovable: Story Board Full Page
- Grid of story cards (all stories from epic)
- Each card: title, status badge, last updated, priority, estimate
- Click card → opens in Story flow (Page 3b)
- Filter/sort controls (by status, priority)
- "Export All" button → exports all completed stories as Markdown

---

## Phase 7 — Navigation, Polish & NFRs (Day 14, ~3 hrs)

### 7.1 Top Navigation Bar
- Left: Accesa logo placeholder + "PO Agent" Poppins Italic
- Centre: **2 tabs** — Product Context / Epic & Stories
  - Evaluation is inline in the right panel — not a separate top-level tab
  - Story Board accessible from within Epic & Stories (sub-view, not a top-level tab)
- Right: checklist icon → opens 320px right drawer

### 7.2 Progress Stepper
- Below nav bar: **2 steps** — Context Setup → Epic/Story Work
- Evaluation is part of the story flow, not a separate step
- Completed: filled navy circle + checkmark
- Active: filled red circle + number
- Upcoming: empty grey

### 7.3 Persistent Checklist Drawer (all pages except Page 4)
- 320px right drawer, slides from right
- Header: "Customer Checklist" in blue
- Each rule: white card + delete icon
- Empty state message
- New items animate in (fade + slide)
- Polls `/get-checklist` every 5 seconds

### 7.4 NFR Checklist
- [ ] All `/validate-context` calls return < 3 seconds
- [ ] `/story-agent` first token < 8 seconds
- [ ] `/evaluate` returns < 10 seconds
- [ ] Evaluation does not trigger unless AC confirmed via chat tile (UI guard — no Submit button)
- [ ] Learning insight response required before action buttons unlock (UI guard)
- [ ] All workflows (except `/save-context`, `/validate-context`) return HTTP 400 with `missing_context` error if `contextId` absent (n8n guard — tested in Phase 0)
- [ ] No PII stored in LLM prompts — only structured product context fields

### 7.5 Context Refresh
- On Page 1 load: if `lastUpdated` > 6 months ago → show orange banner "Context may be outdated. Refresh recommended."
- Manual refresh: "Update Context" link in nav → navigates to Page 1 in edit mode

---

## Phase-by-Phase Verification

| Phase | How to Verify |
|-------|--------------|
| 0 — Infrastructure | n8n test workflow successfully reads/writes Google Sheets and calls OpenRouter |
| 1 — Agent 1 | Submit each field in Page 1. Vague input → FAIL with reason. Good input → PASS + green checkmark. All 5 → row written to Google Sheets |
| 2 — Router | Chat opens → entry tiles appear. Click "An Epic" → right panel switches to Epic Summary. Type free text "login feature" → Router routes to Story silently. Type "onboarding flow with 5 features" → mismatch message appears in chat. |
| 3 — Story Agent | Full conversation → story draft builds in right panel → agent proposes AC → confirmation tiles appear in chat → PO confirms → `/evaluate` fires automatically → right panel tab switches to Evaluation |
| 4 — Evaluator | Right panel shows spinner → scorecard fades in → learning insight arrives in chat → action buttons locked until PO responds → on response: improved story diff unlocks, "Accept / Keep / Edit Further" available → "Edit Further" switches right panel back to Story tab, chat continues |
| 5 — Epic Agent | Type epic description → questions calibrated to domain → story split proposed → drag/remove works → confirm transitions to Story Board |
| 6 — Story Board | Confirm epic split → Story Board shows all cards → clicking into story opens Agent 2b → mini-sidebar tracks progress |
| 7 — Polish | Navigate both tabs → stepper updates correctly → checklist drawer opens from nav icon and polls every 5s → Story Board accessible within Epic & Stories → context refresh banner shows if > 6 months |

---

## Reuse from Existing `user-stories` Skill

The existing Claude skill (`~/.claude/commands/user-stories.md`) contains logic that maps directly to Agent 2b. When writing the Agent 2b system prompt, copy these elements verbatim (adapted for chat format):

| Skill element | Reuse in Agent 2b |
|---|---|
| Story format: As a / I want / So that + Description + AC in 3-6 named categories | Copy directly as the required output structure |
| AC quality rules: specific, testable, bullet points per category, edge cases + error states | Copy directly into AC generation instructions |
| "NEVER ask for epic/category until AC finalised" | Copy as a sequencing rule |
| "Priority + estimate after story content confirmed" | Copy as a sequencing rule |
| "If user can't answer, provide best-guess and ask for correction — don't block" | Copy as an exception handling rule |
| Auto-generate story title from "I want" statement | Copy for right panel story preview header |
| Batch mode: fully complete one story before next | Applies to Epic flow — each story card in Story Board processed one at a time |

**What NOT to carry over from the skill:**
- Step 1 (ask for project/persona/business value) — Agent 2b gets these from Agent 1 context automatically
- AskUserQuestion tool calls — replaced by quiz tiles rendered in Lovable
- "Format for copy-paste into PM tool" — replaced by right panel + Export as Markdown

---

## Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| LLM routing | OpenRouter (single API key) | Simplifies n8n credential management; access to both GPT-4o and Claude |
| Session state | React state + sessionStorage | MVP scope — no cross-session story persistence needed |
| Streaming | Full response only (no SSE) | Chosen for simplicity; show typing dots while waiting, render full message on return |
| n8n session state | Stateless — history in payload | Matches Architecture doc spec; simpler workflows, easier to debug, avoids n8n session timeouts |
| Checklist polling | 5-second interval | Matches UI Spec; simple alternative to WebSockets for MVP |
| Story split state | React state | In-session only per Architecture §7 |

---

## Build Order Summary

```
── MVP ─────────────────────────────────────────────────────────────────
Day 1   → Phase 0: Google Sheets + OpenRouter + n8n credentials + Lovable init
Day 2-3 → Phase 1: Agent 1 (validate-context, save-context) + Context Setup UI
Day 4   → Phase 2: Router webhook + Entry tiles in chat UI
Day 5-7 → Phase 3: Agent 2b (story-agent) + Chat + Story Preview UI
Day 8-9 → Phase 4: Agent 3 (evaluate) + Inline evaluation in right panel
Day 10  → Phase 7: Nav (2 tabs), stepper (2 steps), checklist drawer, NFR checks

── POST-MVP ─────────────────────────────────────────────────────────────
TBD     → Phase 5: Agent 2a (epic-agent) + Epic Flow UI
TBD     → Phase 6: Story Board + mini-sidebar
```
