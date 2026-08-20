export type AIProvider = "openai" | "grok" | "gemini";

export type AITask =
  | "assistant"
  | "customer_support"
  | "marketplace_search"
  | "recommendation"
  | "seller"
  | "affiliate"
  | "creator"
  | "admin_intelligence"
  | "moderation"
  | "analytics";

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIRequest = {
  messages: AIMessage[];
  task?: AITask;
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export type AIUsage = {
  provider: AIProvider;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs: number;
};

export type AIResponse = {
  content: string;
  usage: AIUsage;
  requestId: string;
};
