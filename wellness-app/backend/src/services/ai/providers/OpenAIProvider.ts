import type { AIProvider, ChatMessage, ChatOptions } from "../types";
import { env } from "../../../config/env";
import { AppError } from "../../../utils/AppError";

// Talks to any OpenAI-compatible /chat/completions endpoint. The API key
// lives only here, on the backend — it is never sent to the frontend.
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  private get apiKey(): string {
    if (!env.OPENAI_API_KEY) {
      throw AppError.badRequest("AI_PROVIDER=openai but OPENAI_API_KEY is not set", "AI_MISCONFIGURED");
    }
    return env.OPENAI_API_KEY;
  }

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
    const res = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 1200,
        ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw AppError.badRequest(`AI provider (openai) error ${res.status}: ${body.slice(0, 300)}`, "AI_PROVIDER_ERROR");
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw AppError.badRequest("AI provider returned an empty response", "AI_PROVIDER_ERROR");
    return content;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(env.OPENAI_API_KEY);
  }
}
