import { pollShares, readPollDraft, runeLength } from "./poll";

// 05 · 2026-10-18 — the app's poll composer applies the api's rules before sending.

describe("readPollDraft", () => {
  it("trims and drops blank option rows", () => {
    expect(
      readPollDraft({
        question: " Exam day? ",
        options: ["Sun ", "", " Mon"],
        allowMultiple: true,
      }),
    ).toEqual({ ok: true, question: "Exam day?", options: ["Sun", "Mon"] });
  });

  it.each([
    [{ question: "Hi", options: ["A", "B"] }, "chat.poll.error_question"],
    [{ question: "Exam day?", options: ["A"] }, "chat.poll.error_min_options"],
    [
      { question: "Exam day?", options: ["1", "2", "3", "4", "5", "6", "7"] },
      "chat.poll.error_max_options",
    ],
    [{ question: "Exam day?", options: ["A", "b".repeat(81)] }, "chat.poll.error_option_length"],
    [{ question: "Exam day?", options: ["Sun", "sun"] }, "chat.poll.error_duplicate"],
  ])("refuses %j", (draft, error) => {
    expect(readPollDraft({ ...draft, allowMultiple: false })).toEqual({ ok: false, error });
  });

  it("counts characters like the api", () => {
    expect(runeLength("পরীক্ষা")).toBe(7);
  });
});

describe("pollShares", () => {
  it("rounds each option's share and handles an unvoted poll", () => {
    expect(pollShares([1, 2, 1])).toEqual([25, 50, 25]);
    expect(pollShares([0, 0])).toEqual([0, 0]);
  });
});
