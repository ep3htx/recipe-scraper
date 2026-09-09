export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  // Ask the provider to return strict JSON (used by meal planning, insights).
  jsonMode?: boolean;
}

export interface AIProvider {
  readonly name: string;
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
  isAvailable(): Promise<boolean>;
}
