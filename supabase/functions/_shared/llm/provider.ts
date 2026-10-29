// The language-model interface every agent uses. The concierge's pipeline, knowledge retrieval, conversation memory
// and security rules talk only to this interface, so the provider (today Anthropic, ./anthropic.ts) can be replaced
// by another adapter without touching them. Tests use a scripted fake that implements the same interface.

export type LlmErrorKind =
  | "not_configured" // no key set
  | "auth" // the key was refused
  | "rate_limited" // the provider asked us to slow down
  | "timeout" // no answer in time
  | "unavailable" // the provider is down or overloaded, or the network failed
  | "bad_request" // the provider refused the request itself (a model name that does not exist, for example)
  | "bad_response" // an answer we could not read
  | "refused"; // the model declined to answer

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  /** Fixed instructions. Kept identical between requests so the provider can cache them. */
  system: string;
  messages: LlmMessage[];
  maxTokens: number;
}

export type LlmResult<T> = { ok: true; value: T } | { ok: false; error: LlmErrorKind };

export interface StreamEvents {
  /** A piece of the answer, in order. */
  text: (chunk: string) => void;
  /** Everything sent so far must be discarded (the provider switched to a fallback model mid-answer). */
  reset: () => void;
}

export interface LlmProvider {
  readonly model: string;
  /** One JSON object matching `schema` (a JSON Schema with additionalProperties false everywhere). */
  json(request: LlmRequest & { schema: Record<string, unknown> }): Promise<LlmResult<unknown>>;
  /** A streamed text answer; resolves when the answer is complete or has failed. */
  stream(request: LlmRequest, events: StreamEvents): Promise<LlmResult<{ stopReason: string }>>;
}
