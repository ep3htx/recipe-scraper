import type { AIProvider, ChatMessage, ChatOptions } from "../types";
import { env } from "../../../config/env";
import { AppError } from "../../../utils/AppError";

// Talks to a local or LAN Ollama instance — no external network call, no
// API key. This is the path for a fully self-contained, offline setup.
export class OllamaProvider implements AIProvider {
  readonly name = "ollama";

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
    const res = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.AI_MODEL,
        messages,
        stream: false,
        options: { temperature: opts.temperature ?? 0.4 },
        ...(opts.jsonMode ? { format: "json" } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw AppError.badRequest(`AI provider (ollama) error ${res.status}: ${body.slice(0, 300)}`, "AI_PROVIDER_ERROR");
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const content = data.message?.content;
    if (!content) throw AppError.badRequest("AI provider returned an empty response", "AI_PROVIDER_ERROR");
    return content;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${env.OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}
