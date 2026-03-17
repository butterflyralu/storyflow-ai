import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

const SYSTEM_PROMPT = `You are a Product Owner assistant specializing in breaking down epics into independent user stories.

You receive an epic story and product context. Your job is to split the epic into 3-6 smaller, independent user stories that together cover the epic's scope.

## Rules

1. Each story must be independently deliverable (INVEST: Independent)
2. Each story must have a clear user role, capability, and business value
3. Stories should be ordered by logical implementation sequence
4. Each story should include 2-4 acceptance criteria grouped by category, derived from the original epic's criteria and the story's specific scope
5. Provide a brief epicSummary that captures the original epic's intent
6. Each story should be small enough for a single sprint
7. Don't create stories that are just technical tasks — each must deliver user value
8. Set each sub-story's metadata.epic field to the original epic's title`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { story, agentContext } = await req.json();

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

    const contextStr = agentContext
      ? `\n\nProduct Context:\n- Product Name: ${agentContext.productName || "Not set"}\n- Mission: ${agentContext.mission || "Not set"}\n- Persona: ${agentContext.persona || "Not set"}\n- Strategy: ${agentContext.strategy || "Not set"}\n- North Star: ${agentContext.northStar || "Not set"}\n- Objectives: ${agentContext.objectives || "Not set"}`
      : "";

    const storyStr = `\n\nEpic Story to Split:\n${JSON.stringify(story, null, 2)}`;

    const toolDef = {
      type: "function",
      function: {
        name: "split_epic",
        description: "Return the epic split into independent user stories.",
        parameters: {
          type: "object",
          properties: {
            epicSummary: {
              type: "string",
              description: "A brief summary of the original epic's intent.",
            },
            stories: {
              type: "array",
              items: {
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
                        items: { type: "array", items: { type: "string" } },
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
                required: ["title", "asA", "iWant", "soThat", "description", "acceptanceCriteria", "metadata"],
                additionalProperties: false,
              },
            },
          },
          required: ["epicSummary", "stories"],
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
          messages: [
            { role: "system", content: SYSTEM_PROMPT + contextStr + storyStr },
            { role: "user", content: "Split this epic into 3-6 independent user stories." },
          ],
          tools: [toolDef],
          tool_choice: { type: "function", function: { name: "split_epic" } },
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
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

    logUsage(req, "split-story", aiModel, data.usage);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("split-story error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
