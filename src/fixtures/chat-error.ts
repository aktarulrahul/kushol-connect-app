// Shared fixture error — kept out of chat.ts / media.ts so those seams do not form a require cycle.

export type ChatFixtureErrorCode =
  | "OFFLINE"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "NOT_VERIFIED"
  | "SEND_FAILED";

export class ChatFixtureError extends Error {
  constructor(
    readonly code: ChatFixtureErrorCode,
    readonly detail?: string,
  ) {
    super(`fixture:chat:${code}`);
    this.name = "ChatFixtureError";
  }
}
