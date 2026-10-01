import { isBdPhone, normalizePhone, validateContact } from "./register";

// Validation rules (01-user-stories.md §6): BD mobile `^(?:\+?880|0)1[3-9]\d{8}$` normalized to
// E.164, full name 2–80, guardian-only student code 3–20 + relation. Message values are i18n keys.

describe("phone", () => {
  it.each([
    "01712345678",
    "01812345678",
    "01912345678",
    "+8801712345678",
    "8801712345678",
    "01312345678",
  ])("accepts %s", (phone) => {
    expect(isBdPhone(phone)).toBe(true);
  });

  it.each([
    "01234567890", // 12 prefix — not in [3-9]
    "0171234567", // too short
    "017123456789", // too long
    "1234567890",
    "0171234567a",
    "",
  ])("rejects %s", (phone) => {
    expect(isBdPhone(phone)).toBe(false);
  });

  it("normalizes to E.164 +880…", () => {
    expect(normalizePhone("01712345678")).toBe("+8801712345678");
    expect(normalizePhone("+8801712345678")).toBe("+8801712345678");
    expect(normalizePhone("8801812345678")).toBe("+8801812345678");
    expect(normalizePhone(" 01912345678 ")).toBe("+8801912345678");
  });

  it("leaves invalid input untouched for the error path", () => {
    expect(normalizePhone("12345")).toBe("12345");
  });
});

describe("validateContact", () => {
  const base = {
    role: "student" as const,
    fullName: "ডেমো শিক্ষার্থী",
    phone: "01712345678",
    studentCode: "",
    relation: null,
  };

  it("accepts a complete student draft", () => {
    expect(validateContact(base)).toEqual({});
  });

  it("maps a short name to validation.name.length", () => {
    expect(validateContact({ ...base, fullName: " ক " })).toEqual({
      full_name: "validation.name.length",
    });
  });

  it("maps a bad phone to validation.phone.invalid (80 chars is still fine)", () => {
    expect(validateContact({ ...base, phone: "01234567890" })).toEqual({
      phone: "validation.phone.invalid",
    });
    const longName = "ক".repeat(80);
    expect(validateContact({ ...base, fullName: longName }).full_name).toBeUndefined();
    expect(validateContact({ ...base, fullName: `${longName}ক` }).full_name).toBe(
      "validation.name.length",
    );
  });

  it("ignores student_code and relation for non-guardians", () => {
    expect(validateContact({ ...base, studentCode: "", relation: null })).toEqual({});
  });

  it("requires student code 3–20 and a relation for guardians", () => {
    const guardian = { ...base, role: "guardian" as const };
    expect(validateContact(guardian)).toEqual({
      student_code: "validation.guardian.student_code",
      relation: "validation.choose_one",
    });
    expect(validateContact({ ...guardian, studentCode: "STU-42", relation: "mother" })).toEqual({});
    expect(
      validateContact({ ...guardian, studentCode: "ab", relation: "mother" }).student_code,
    ).toBe("validation.guardian.student_code");
  });
});
