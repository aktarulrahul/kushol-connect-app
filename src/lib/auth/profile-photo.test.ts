// Profile photo upload outcome (owner 2026-10-20): only a stored upload counts — a refused or
// oversized photo surfaces as an error instead of a photo only this phone shows.
import { photoUploadFailure } from "@/lib/auth/profile-photo";

describe("profile photo upload outcome", () => {
  it("treats 2xx as stored", () => {
    expect(photoUploadFailure(200)).toBeNull();
    expect(photoUploadFailure(201)).toBeNull();
  });

  it("names an oversized photo (proxy or api cap)", () => {
    expect(photoUploadFailure(413)).toBe("too_large");
  });

  it("reports every other answer as rejected", () => {
    expect(photoUploadFailure(400)).toBe("rejected");
    expect(photoUploadFailure(401)).toBe("rejected");
    expect(photoUploadFailure(500)).toBe("rejected");
  });
});
