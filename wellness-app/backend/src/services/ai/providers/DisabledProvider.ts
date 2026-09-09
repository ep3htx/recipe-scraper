import type { AIProvider, ChatMessage } from "../types";
import { AppError } from "../../../utils/AppError";

// The application must keep working with AI turned off — logging, charts,
// habits, goals, exports, everything except the coach itself stays fully
// usable. This provider just fails loudly and predictably when the coach
// is actually invoked.
export class DisabledProvider implements AIProvider {
  readonly name = "disabled";

  async chat(_messages: ChatMessage[]): Promise<string> {
    throw AppError.badRequest(
      "The AI Coach is disabled on this server. Set AI_PROVIDER=openai or AI_PROVIDER=ollama in .env to enable it.",
      "AI_DISABLED"
    );
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }
}
