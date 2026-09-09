import { env } from "../../config/env";
import type { AIProvider, ChatMessage, ChatOptions } from "./types";
import { DisabledProvider } from "./providers/DisabledProvider";
import { OpenAIProvider } from "./providers/OpenAIProvider";
import { OllamaProvider } from "./providers/OllamaProvider";
import { buildSafetySystemPrompt } from "./safety";

// Central switchboard: everything that wants to talk to an LLM goes through
// this module, never through a provider class directly. Swapping providers
// is a single env var (AI_PROVIDER); nothing else in the app changes.
function createProvider(): AIProvider {
  switch (env.AI_PROVIDER) {
    case "openai":
      return new OpenAIProvider();
    case "ollama":
      return new OllamaProvider();
    default:
      return new DisabledProvider();
  }
}

let providerInstance: AIProvider | null = null;
export function getProvider(): AIProvider {
  if (!providerInstance) providerInstance = createProvider();
  return providerInstance;
}

export async function isAIEnabled(): Promise<boolean> {
  return getProvider().isAvailable();
}

// Every coach request routes through here so the safety system prompt is
// applied uniformly — no code path can accidentally skip it.
export async function chatWithSafety(
  contextSystemPrompt: string,
  messages: ChatMessage[],
  opts?: ChatOptions
): Promise<string> {
  const systemMessages: ChatMessage[] = [
    { role: "system", content: buildSafetySystemPrompt() },
    { role: "system", content: contextSystemPrompt },
  ];
  return getProvider().chat([...systemMessages, ...messages], opts);
}
