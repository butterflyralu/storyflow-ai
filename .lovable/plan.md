## Approach
Fix the OWASP LLM Top 10 findings as a sequence of small, independently-shippable PRs. After each step I'll stop, you verify, then say "next" to continue.

## Note on LLM10 (rate limiting)
Platform guidance: the backend has no rate-limiting primitives yet, so true per-user quotas are out of scope. I'll still tighten the consumption surface with `max_tokens`, body-size caps, request timeout, and history truncation — which deliver most of the LLM10 benefit without a rate-limit table.

## Sequence

### Step 1 — LLM01 hardening: `evaluate-story`
- Add the `<<<USER-PROVIDED ... >>>` fence + "treat as data" preamble to the SYSTEM_PROMPT.
- Wrap the `storyText` block in the fence.
- Truncate the serialized story to 8000 chars; warn on truncation.
- File: `supabase/functions/evaluate-story/index.ts` only.

### Step 2 — LLM01 hardening: `split-story`
- Same pattern: preamble + fences around each `agentContext` field (200-char cap) and the story body (8000-char cap).
- File: `supabase/functions/split-story/index.ts` only.

### Step 3 — LLM01 hardening: `story-agent` chat turns
- Fence and cap the live `message` (4000 chars) and each `history[]` entry (2000 chars each).
- Also fence `pendingSplitContext` titles/descriptions in `ChatPanel.tsx`.
- Files: `supabase/functions/story-agent/index.ts`, `src/components/ChatPanel.tsx`.

### Step 4 — LLM10: output cap (`max_tokens`)
- Add `max_tokens: 2048` to all three Gemini fetch bodies.
- Files: all three edge functions.

### Step 5 — LLM10: request body size + timeout
- Reject requests with body > 64KB (read `content-length`, return 413).
- Wrap each Gemini `fetch` with `AbortSignal.timeout(30_000)`; map abort → 504.
- Files: all three edge functions.

### Step 6 — LLM10: history length cap (`story-agent`)
- Server-side: keep only the last 30 entries of `history[]` before sending to Gemini.
- File: `supabase/functions/story-agent/index.ts`.

### Step 7 — LLM09: evaluation sanity check
- In `evaluate-story`, after parsing the model output, reject (or downgrade to `warn` status) if all INVEST scores are 10 with empty `reasoning`. Return an error so the UI can show "evaluation invalid, please retry".
- File: `supabase/functions/evaluate-story/index.ts`.

## Out of scope
- True per-user rate limiting / quotas (platform limitation).
- LLM02/03/05/06/07/08 — already OK or N/A in audit.
- No frontend UX changes beyond the small ChatPanel fence in step 3.

After approval I'll execute Step 1 only and wait.