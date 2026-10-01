import {
  emptySchoolRequestForm,
  validateSchoolRequest,
} from "./school-request";

// School-request form validation (owner requirement 2026-10-01): institution name 2–120,
// optional address ≤ 240, POC name 2–80, POC phone is a BD mobile (shared validation), POC
// email optional. Message values are i18n keys — nothing user-facing lives here.

const valid = emptySchoolRequestForm("city_dhaka");
valid.name = "ডেমো কলেজ";
valid.pocName = "ডেমো পিওসি";
valid.pocPhone = "01812345678";

describe("validateSchoolRequest", () => {
  it("accepts the golden path with only the required fields", () => {
    expect(validateSchoolRequest(valid)).toEqual({});
  });

  it("rejects an invalid POC phone with the shared phone key", () => {
    expect(validateSchoolRequest({ ...valid, pocPhone: "12345" })).toEqual({
      poc_phone: "validation.phone.invalid",
    });
    expect(validateSchoolRequest({ ...valid, pocPhone: "0212345678" })).toEqual({
      poc_phone: "validation.phone.invalid",
    });
  });

  it("bounds the institution name at 2–120 and the address at 240", () => {
    expect(validateSchoolRequest({ ...valid, name: "ক" })).toEqual({
      name: "validation.school_name.length",
    });
    expect(validateSchoolRequest({ ...valid, name: "খ".repeat(121) })).toEqual({
      name: "validation.school_name.length",
    });
    expect(validateSchoolRequest({ ...valid, address: "র" })).toEqual({});
    expect(validateSchoolRequest({ ...valid, address: "র".repeat(241) })).toEqual({
      address: "validation.school_address.length",
    });
  });

  it("bounds the POC name at 2–80 and checks the optional POC email only when given", () => {
    expect(validateSchoolRequest({ ...valid, pocName: "ড" })).toEqual({
      poc_name: "validation.name.length",
    });
    expect(validateSchoolRequest({ ...valid, pocEmail: "" })).toEqual({});
    expect(validateSchoolRequest({ ...valid, pocEmail: "not-an-email" })).toEqual({
      poc_email: "validation.email.invalid",
    });
    expect(validateSchoolRequest({ ...valid, pocEmail: "poc@demo.example" })).toEqual({});
  });

  it("requires a city (prefilled from the chosen one in the UI)", () => {
    expect(validateSchoolRequest({ ...valid, cityId: " " })).toEqual({
      city_id: "validation.choose_one",
    });
  });
});
