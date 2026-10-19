// Poll composer rules (05 · owner 2026-10-18), mirroring the api's ValidatePoll: a 3–200 char
// question and 2–6 distinct options of 1–80 chars. Blank option rows are ignored. Errors are
// i18n keys so the sheet shows them in the reader's language.

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 6;
export const POLL_QUESTION_MAX = 200;
export const POLL_OPTION_MAX = 80;

/** Length in code points — what the api counts (Go runes). */
export function runeLength(text: string): number {
  return Array.from(text).length;
}

export type PollDraft = { question: string; options: string[]; allowMultiple: boolean };

export type PollDraftError =
  | "chat.poll.error_question"
  | "chat.poll.error_min_options"
  | "chat.poll.error_max_options"
  | "chat.poll.error_option_length"
  | "chat.poll.error_duplicate";

/** The trimmed poll to send, or the first problem's i18n key. */
export function readPollDraft(
  draft: PollDraft,
): { ok: true; question: string; options: string[] } | { ok: false; error: PollDraftError } {
  const question = draft.question.trim();
  const qLen = runeLength(question);
  if (qLen < 3 || qLen > POLL_QUESTION_MAX) return { ok: false, error: "chat.poll.error_question" };
  const options = draft.options.map((o) => o.trim()).filter((o) => o !== "");
  if (options.length < POLL_MIN_OPTIONS) return { ok: false, error: "chat.poll.error_min_options" };
  if (options.length > POLL_MAX_OPTIONS) return { ok: false, error: "chat.poll.error_max_options" };
  if (options.some((o) => runeLength(o) > POLL_OPTION_MAX)) {
    return { ok: false, error: "chat.poll.error_option_length" };
  }
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
    return { ok: false, error: "chat.poll.error_duplicate" };
  }
  return { ok: true, question, options };
}

/** Poll tallies → per-option share (0–100, rounded) for the bars. */
export function pollShares(votes: readonly number[]): number[] {
  const total = votes.reduce((sum, v) => sum + v, 0);
  return votes.map((v) => (total > 0 ? Math.round((v / total) * 100) : 0));
}
