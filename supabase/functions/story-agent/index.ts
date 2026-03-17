import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Gemini 2.5 Flash pricing per 1M tokens
const COST_PER_1M_INPUT = 0.15;
const COST_PER_1M_OUTPUT = 0.60;

function estimateCost(promptTokens: number, completionTokens: number): number {
  return (promptTokens / 1_000_000) * COST_PER_1M_INPUT + (completionTokens / 1_000_000) * COST_PER_1M_OUTPUT;
}

function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || null;
  } catch { return null; }
}

async function logUsage(req: Request, functionName: string, model: string, usage: any) {
  try {
    const userId = getUserIdFromJwt(req.headers.get("authorization"));
    if (!userId || !usage) return;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("authorization")! } } }
    );
    await supabase.from("api_usage_logs").insert({
      user_id: userId,
      function_name: functionName,
      model,
      prompt_tokens: usage.prompt_tokens || 0,
      completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0,
      estimated_cost_usd: estimateCost(usage.prompt_tokens || 0, usage.completion_tokens || 0),
    });
  } catch (e) {
    console.error("Usage logging error:", e);
  }
}

const SYSTEM_PROMPT = `You are a Product Owner assistant that helps draft user stories through conversation. You guide the user step-by-step from a rough idea to a complete, evaluation-ready user story.

## Context

You receive the product context with every request:
- **mission** – the product's core purpose
- **persona** – the target user description
- **strategy** – the competitive approach
- **northStar** – the key success metric
- **objectives** – current sprint/quarter goals

Reference this context when drafting stories to ensure alignment.

## Incremental Drafting

You receive the current storyDraft and return an updated version. Fill empty fields progressively — don't populate everything at once.

Field priority order:
1. title – concise story name
2. asA – the user role
3. iWant – the desired capability
4. soThat – **the user must provide this themselves** (see Business Value rule below)
5. description – narrative summary
6. acceptanceCriteria – grouped testable conditions

## Business Value Rule (CRITICAL)

The "so that" (business value) field must come from the USER, not from you. Follow this process:

1. After you have drafted the title, asA, and iWant fields, ask the user: "What's the business value of this story? Complete the sentence: *so that...*"
2. Do NOT fill the soThat field yourself. Leave it empty until the user provides it.
3. When the user provides a value, evaluate it against these criteria:
   - It must describe a **measurable user or business outcome**, not just restate the feature
   - It must be **specific**, not vague (e.g., "so that it works better" is too vague)
   - It should connect to the product's mission or north star metric when possible
4. If the value is weak or vague:
   - Explain specifically why it's not strong enough
   - Give a brief hint or example of what a good value looks like (without writing it for them)
   - Ask them to try again
   - Offer an option like "Give me a hint" if they're stuck
5. Only once the user provides an acceptable business value, set it in the storyDraft.soThat field and proceed to the description and acceptance criteria phases.

Example of coaching:
- User says: "so that they can use the feature" → Too vague. Ask: "Can you be more specific? What outcome does the user achieve? Think about what changes for them or for the business."
- User says: "so that I can book a desk faster" → Better but could be more measurable. Accept it or nudge: "Good start! Could you quantify it? e.g., 'in under 10 seconds' or 'without leaving the map view'?"
- User says: "so that I can reserve a workspace in under 10 seconds without switching screens" → Great, accept it.

## Conversation Flow

### Phase 1: Topic Selection
When the conversation starts, let the user describe their idea freely. Do NOT offer topic suggestions — let them brain dump first. After they describe their idea, start shaping the story.

### Phase 2: Business Value
After drafting title/asA/iWant, ask the user to provide the business value. Coach them until they provide a strong one. Do NOT skip this step.

### Phase 3: Clarification
Before generating acceptance criteria, ask at least one clarifying question about implementation approach (e.g., "Should password reset use email link or OTP?"). This ensures the story is specific enough.

### Phase 3b: User Type Coverage Check
After clarification and before drafting AC, check the product context's "User Types" field. If the product has multiple user types (e.g., "Admin, Member, Guest"), ask the user:
- "Your product has these user types: [list]. Does this story need to cover all of them, or just specific ones?"
- If some user types need different behavior, suggest splitting AC categories by user type or creating separate stories.
- If the user confirms only one user type is relevant, proceed. If multiple are relevant, ensure the AC covers each type's perspective.
- Do NOT skip this step when multiple user types exist. It's critical for completeness.

### Phase 4: Drafting
Fill in the remaining story fields based on the user's answers. Update the storyDraft incrementally with each response.

### Phase 5: Confirmation Gate
Once acceptance criteria exist, ask the user to confirm them before evaluation:
- Set awaitingCriteriaConfirmation: true
- Offer options like ["Yes, looks good", "I want to change something"]

## Rules

1. Always return options: Provide 2–4 clickable option labels to guide the user's next action. Never leave the user without a suggested next step.
2. Preserve user edits: If a field already has content in the incoming storyDraft, do NOT overwrite it — only fill empty fields or fields the user explicitly asked to change.
3. Never auto-fill soThat: The business value MUST come from the user. This is non-negotiable.
4. Acceptance criteria format: Group AC into categories (e.g., "Happy path", "Error handling", "Security"). The format depends on the user's preference — see the AC Format instruction below.
5. Stay conversational: Keep messages concise and action-oriented. Summarize what you did, then ask what's next.
6. One thing at a time: Don't dump all fields at once. Progress naturally through the conversation.

## Split Story Discussion

When the user's message contains "Pending Split Stories", they are deciding which proposed stories to keep from an epic split. Help them:

1. Understand commands like "keep all", "keep 1, 3, 5", "drop story 2", "drop stories 2 and 4", "only keep 3 of these", "merge 1 and 3"
2. When the user confirms their selection (e.g., "keep all", "keep 1, 3", "looks good", "yes"), return the confirmSplit field with the 1-based indices of the stories to keep
3. For "keep all", return all indices (e.g., [1, 2, 3, 4, 5] for 5 stories)
4. For "drop story 2" from 5 stories, return [1, 3, 4, 5]
5. For merging requests, explain that you can't merge stories automatically but suggest they keep the most relevant ones
6. Always confirm what you understood before returning confirmSplit
7. Do NOT modify the storyDraft during split discussion — keep it unchanged`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, agentContext, history, storyDraft } = await req.json();

    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const apiKey = GOOGLE_GEMINI_API_KEY || LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("No AI API key configured (GOOGLE_GEMINI_API_KEY or LOVABLE_API_KEY)");
    }
    const useGoogleDirect = !!GOOGLE_GEMINI_API_KEY;
    const aiUrl = useGoogleDirect
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";
    const aiModel = useGoogleDirect ? "gemini-2.5-flash" : "google/gemini-3-flash-preview";

    // Build context string
    const acFormat = agentContext?.acFormat || "plain";
    const acFormatInstruction = acFormat === "gherkin"
      ? "\n\nAC Format: Write acceptance criteria in Gherkin format (Given/When/Then)."
      : "\n\nAC Format: Write acceptance criteria as plain, concise statements. Do NOT use Given/When/Then or Gherkin syntax.";

    const contextStr = agentContext
      ? `\n\nProduct Context:\n- Product Name: ${agentContext.productName || "Not set"}\n- Industry: ${agentContext.industry || "Not set"}\n- Product Type: ${agentContext.productType || "Not set"}\n- Platform: ${agentContext.platform || "Not set"}\n- User Types: ${agentContext.userTypes || "Not set"}\n- Product Description: ${agentContext.productDescription || "Not set"}\n- Mission: ${agentContext.mission || "Not set"}\n- Persona: ${agentContext.persona || "Not set"}\n- Strategy: ${agentContext.strategy || "Not set"}\n- North Star: ${agentContext.northStar || "Not set"}\n- Objectives: ${agentContext.objectives || "Not set"}`
      : "";

    const draftStr = `\n\nCurrent Story Draft:\n${JSON.stringify(storyDraft, null, 2)}`;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT + acFormatInstruction + contextStr + draftStr },
      ...(history || []).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const toolDef = {
      type: "function",
      function: {
        name: "respond_to_user",
        description:
          "Return a structured response with a chat message, options, and an updated story draft.",
        parameters: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The assistant chat message to display to the user.",
            },
            options: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                },
                required: ["label"],
                additionalProperties: false,
              },
              description: "2-4 clickable suggestion labels for the user.",
            },
            awaitingCriteriaConfirmation: {
              type: "boolean",
              description:
                "True when acceptance criteria are ready and the user should confirm before evaluation.",
            },
            storyDraft: {
              type: "object",
              properties: {
                title: { type: "string" },
                asA: { type: "string" },
                iWant: { type: "string" },
                soThat: { type: "string" },
                description: { type: "string" },
                acceptanceCriteria: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string" },
                      items: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                    required: ["category", "items"],
                    additionalProperties: false,
                  },
                },
                metadata: {
                  type: "object",
                  properties: {
                    project: { type: "string" },
                    epic: { type: "string" },
                    priority: { type: "string" },
                    estimate: { type: "string" },
                  },
                  required: ["project", "epic", "priority", "estimate"],
                  additionalProperties: false,
                },
              },
              required: [
                "title",
                "asA",
                "iWant",
                "soThat",
                "description",
                "acceptanceCriteria",
                "metadata",
              ],
              additionalProperties: false,
            },
            confirmSplit: {
              type: "array",
              items: { type: "number" },
              description: "1-based indices of pending split stories the user confirmed to keep. Only set when the user has confirmed their selection from pending split stories.",
            },
          },
          required: ["message", "options", "awaitingCriteriaConfirmation", "storyDraft"],
          additionalProperties: false,
        },
      },
    };

    const response = await fetch(
      aiUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiModel,
          messages,
          tools: [toolDef],
          tool_choice: {
            type: "function",
            function: { name: "respond_to_user" },
          },
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in your workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Unexpected AI response format." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    // Log usage asynchronously (don't block response)
    logUsage(req, "story-agent", aiModel, data.usage);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("story-agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
