// Phoenix Cloud OTLP tracer for Gemini calls.
// Sends OpenInference-formatted spans to https://app.phoenix.arize.com/v1/traces
// Controlled by env: PHOENIX_API_KEY (required to enable), PHOENIX_REDACT_CONTENT ("true" to redact prompt/response text)

const PHOENIX_ENDPOINT = "https://app.phoenix.arize.com/v1/traces";
const PROJECT_NAME = "storyflow-ai";

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function nowNano(): string {
  // OTLP wants nanoseconds since epoch as a string
  return (BigInt(Date.now()) * 1_000_000n).toString();
}

function attr(key: string, value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return { key, value: { stringValue: value } };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { key, value: { intValue: value } }
      : { key, value: { doubleValue: value } };
  }
  if (typeof value === "boolean") return { key, value: { boolValue: value } };
  return { key, value: { stringValue: JSON.stringify(value) } };
}

export interface TraceLLMCallParams {
  functionName: string;       // e.g. "story-agent"
  model: string;              // e.g. "gemini-2.5-flash"
  provider: string;           // e.g. "google" or "lovable-gateway"
  userId?: string | null;
  sessionId?: string | null;
  systemPrompt?: string;
  inputMessages: Array<{ role: string; content: string }>;
  outputContent: string;          // best-effort string of the model's output (can be JSON.stringified tool call)
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  startTimeMs: number;
  endTimeMs: number;
  status?: "OK" | "ERROR";
  errorMessage?: string;
  extraAttributes?: Record<string, unknown>;
}

export async function tracePhoenixLLMCall(params: TraceLLMCallParams): Promise<void> {
  const apiKey = Deno.env.get("PHOENIX_API_KEY");
  if (!apiKey) return; // tracing disabled

  const redact = Deno.env.get("PHOENIX_REDACT_CONTENT") === "true";

  try {
    const traceId = randomHex(16);
    const spanId = randomHex(8);

    const startNs = (BigInt(params.startTimeMs) * 1_000_000n).toString();
    const endNs = (BigInt(params.endTimeMs) * 1_000_000n).toString();

    const attributes: Array<ReturnType<typeof attr>> = [];

    // OpenInference semantic conventions
    attributes.push(attr("openinference.span.kind", "LLM"));
    attributes.push(attr("llm.provider", params.provider));
    attributes.push(attr("llm.system", params.provider));
    attributes.push(attr("llm.model_name", params.model));
    attributes.push(attr("function.name", params.functionName));

    if (params.userId) attributes.push(attr("user.id", params.userId));
    if (params.sessionId) attributes.push(attr("session.id", params.sessionId));

    // Token usage
    if (params.usage) {
      if (params.usage.prompt_tokens !== undefined)
        attributes.push(attr("llm.token_count.prompt", params.usage.prompt_tokens));
      if (params.usage.completion_tokens !== undefined)
        attributes.push(attr("llm.token_count.completion", params.usage.completion_tokens));
      if (params.usage.total_tokens !== undefined)
        attributes.push(attr("llm.token_count.total", params.usage.total_tokens));
    }

    // Input / output content (or redacted)
    if (redact) {
      attributes.push(attr("input.value", "[REDACTED]"));
      attributes.push(attr("output.value", "[REDACTED]"));
      attributes.push(attr("openinference.redacted", true));
    } else {
      const fullInput = params.systemPrompt
        ? [{ role: "system", content: params.systemPrompt }, ...params.inputMessages]
        : params.inputMessages;
      attributes.push(attr("input.value", JSON.stringify(fullInput)));
      attributes.push(attr("input.mime_type", "application/json"));
      attributes.push(attr("output.value", params.outputContent));
      attributes.push(attr("output.mime_type", "application/json"));

      // Per-message attributes
      fullInput.forEach((m, i) => {
        attributes.push(attr(`llm.input_messages.${i}.message.role`, m.role));
        attributes.push(attr(`llm.input_messages.${i}.message.content`, m.content));
      });
      attributes.push(attr("llm.output_messages.0.message.role", "assistant"));
      attributes.push(attr("llm.output_messages.0.message.content", params.outputContent));
    }

    // Project tag for Phoenix UI grouping
    const resourceAttributes = [
      attr("service.name", PROJECT_NAME),
      attr("openinference.project.name", PROJECT_NAME),
    ].filter(Boolean);

    if (params.extraAttributes) {
      for (const [k, v] of Object.entries(params.extraAttributes)) {
        attributes.push(attr(k, v));
      }
    }

    const span = {
      traceId,
      spanId,
      name: `${params.functionName}.llm`,
      kind: 3, // SPAN_KIND_CLIENT
      startTimeUnixNano: startNs,
      endTimeUnixNano: endNs,
      attributes: attributes.filter(Boolean),
      status: {
        code: params.status === "ERROR" ? 2 : 1, // 1 OK, 2 ERROR
        message: params.errorMessage ?? "",
      },
    };

    const payload = {
      resourceSpans: [
        {
          resource: { attributes: resourceAttributes },
          scopeSpans: [
            {
              scope: { name: "storyflow-edge", version: "1.0.0" },
              spans: [span],
            },
          ],
        },
      ],
    };

    const res = await fetch(PHOENIX_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        api_key: apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Phoenix trace export failed:", res.status, text.slice(0, 300));
    }
  } catch (e) {
    console.error("Phoenix tracing error:", e);
  }
}

export function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}
