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

const SYSTEM_PROMPT = `You are a user story quality evaluator. You receive a user story draft and evaluate it against the INVEST framework and Definition of Ready (DoR) criteria.

## Evaluation Frameworks

### INVEST
Evaluate each criterion:
- **Independent** – Can this story be developed and delivered without depending on other stories?
- **Negotiable** – Is the story flexible enough to allow discussion about implementation details?
- **Valuable** – Does the "so that" clause clearly state a measurable user or business outcome?
- **Estimable** – Is there enough detail for the team to estimate effort?
- **Small** – Can this story be completed within a single sprint?
- **Testable** – Do the acceptance criteria have clear, measurable pass/fail conditions?

### Definition of Ready (DoR)
- **Acceptance Criteria** – Are acceptance criteria present, grouped, and specific?
- **Description** – Is the description clear and sufficient for development?

## Output Requirements

For each criterion that FAILS, provide:
1. A specific, actionable explanation of what's wrong
2. In the improvedStory, provide a concrete fix for the failing field

For PASS criteria, provide a brief confirmation.

The improvedStory should be a complete, improved version of the story that addresses ALL failures. Only change fields related to failures — preserve everything else exactly as-is.

## Epic Detection
Set isLikelyEpic to true if the story spans multiple user interactions, requires multiple sprints, or contains multiple independent outcomes.

## Learning Insight
Provide one observation about a common pattern you noticed, a reflective question for the author, and a concrete suggestion for improvement.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { story, sessionId, contextId } = await req.json();

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

    const storyText = `Title: ${story.title}
As a ${story.asA}, I want to ${story.iWant}, so that ${story.soThat}

Description: ${story.description}

Acceptance Criteria:
${story.acceptanceCriteria.map((g: { category: string; items: string[] }) =>
  `[${g.category}]\n${g.items.map((item: string) => `- ${item}`).join("\n")}`
).join("\n\n")}`;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Evaluate this user story:\n\n${storyText}` },
    ];

    const toolDef = {
      type: "function",
      function: {
        name: "return_evaluation",
        description: "Return the structured evaluation result for the user story.",
        parameters: {
          type: "object",
          properties: {
            scorecard: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  framework: { type: "string", enum: ["INVEST", "DoR"] },
                  criterion: { type: "string" },
                  result: { type: "string", enum: ["PASS", "FAIL"] },
                  explanation: { type: "string" },
                },
                required: ["framework", "criterion", "result", "explanation"],
                additionalProperties: false,
              },
            },
            overallResult: { type: "string", enum: ["PASS", "FAIL"] },
            improvedStory: {
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
            learningInsight: {
              type: "object",
              properties: {
                observation: { type: "string" },
                question: { type: "string" },
                suggestion: { type: "string" },
              },
              required: ["observation", "question", "suggestion"],
              additionalProperties: false,
            },
            newChecklistRule: {
              type: ["object", "null"],
              properties: {
                rule: { type: "string" },
              },
              required: ["rule"],
              additionalProperties: false,
            },
            isLikelyEpic: { type: "boolean" },
          },
          required: ["scorecard", "overallResult", "improvedStory", "learningInsight", "newChecklistRule", "isLikelyEpic"],
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
          tool_choice: { type: "function", function: { name: "return_evaluation" } },
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

      return new Response(
        JSON.stringify({ error: "AI evaluation service error. Please try again." }),
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

    // Preserve original metadata if not provided by AI
    if (!parsed.improvedStory.metadata || !parsed.improvedStory.metadata.priority) {
      parsed.improvedStory.metadata = story.metadata || { project: "", epic: "", priority: "Medium", estimate: "" };
    }

    logUsage(req, "evaluate-story", aiModel, data.usage);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-story error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
