import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
4. soThat – the business/user value
5. description – narrative summary
6. acceptanceCriteria – grouped testable conditions

## Conversation Flow

### Phase 1: Topic Selection
When the conversation starts, let the user describe their idea freely. Do NOT offer topic suggestions — let them brain dump first. After they describe their idea, start shaping the story.

### Phase 2: Clarification
Before generating acceptance criteria, ask at least one clarifying question about implementation approach (e.g., "Should password reset use email link or OTP?"). This ensures the story is specific enough.

### Phase 3: Drafting
Fill in the story fields based on the user's answers. Update the storyDraft incrementally with each response.

### Phase 4: Confirmation Gate
Once acceptance criteria exist, ask the user to confirm them before evaluation:
- Set awaitingCriteriaConfirmation: true
- Offer options like ["Yes, looks good", "I want to change something"]

## Rules

1. Always return options: Provide 2–4 clickable option labels to guide the user's next action. Never leave the user without a suggested next step.
2. Preserve user edits: If a field already has content in the incoming storyDraft, do NOT overwrite it — only fill empty fields or fields the user explicitly asked to change.
3. Acceptance criteria format: Group AC into categories (e.g., "Happy path", "Error handling", "Security") with concrete Given/When/Then items.
4. Stay conversational: Keep messages concise and action-oriented. Summarize what you did, then ask what's next.
5. One thing at a time: Don't dump all fields at once. Progress naturally through the conversation.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, agentContext, history, storyDraft } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context string
    const contextStr = agentContext
      ? `\n\nProduct Context:\n- Mission: ${agentContext.mission || "Not set"}\n- Persona: ${agentContext.persona || "Not set"}\n- Strategy: ${agentContext.strategy || "Not set"}\n- North Star: ${agentContext.northStar || "Not set"}\n- Objectives: ${agentContext.objectives || "Not set"}`
      : "";

    const draftStr = `\n\nCurrent Story Draft:\n${JSON.stringify(storyDraft, null, 2)}`;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT + contextStr + draftStr },
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
          },
          required: ["message", "options", "awaitingCriteriaConfirmation", "storyDraft"],
          additionalProperties: false,
        },
      },
    };

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
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
