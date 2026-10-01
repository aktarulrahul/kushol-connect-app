import {
  createSchoolRequest,
  FIXTURE_MODES,
  FixtureError,
  fixtureApproveCurrentUser,
  fixtureFlags,
  fixtureRejectCurrentUser,
  fixtureSession,
  getDevices,
  getMe,
  listCities,
  listSchools,
  listSections,
  loginPassword,
  patchMe,
  refreshTokens,
  register,
  requestOtp,
  resetFixtureAuth,
  revokeDevice,
  verifyOtp,
} from "./auth";

// The Stage-2 seam: flag-driven failure states, realistic success flows, and the mock hierarchy
// (module 04) — every fixture call also exercises the latency path the screens animate against.
jest.setTimeout(30_000);

beforeEach(() => {
  resetFixtureAuth();
});

describe("flag switcher", () => {
  it("exposes the documented modes and defaults to success", () => {
    expect(FIXTURE_MODES).toEqual([
      "success",
      "invalid_otp",
      "rate_limited",
      "suspended",
      "unknown_phone",
      "sms_delayed",
      "offline",
    ]);
    expect(fixtureFlags.mode).toBe("success");
    fixtureFlags.set("offline");
    expect(fixtureFlags.mode).toBe("offline");
    fixtureFlags.reset();
    expect(fixtureFlags.mode).toBe("success");
  });
});

describe("offline refusal", () => {
  it("refuses OTP request and verify — auth never queues silently", async () => {
    fixtureFlags.set("offline");
    await expect(requestOtp({ phone: "+8801712345678" })).rejects.toMatchObject({
      code: "OFFLINE",
    });
    await expect(
      verifyOtp({ phone: "+8801712345678", otpCode: "123456", purpose: "register" }),
    ).rejects.toBeInstanceOf(FixtureError);
  });
});

describe("registration golden path", () => {
  it("request → verify → register leaves the account PENDING with tokens", async () => {
    await requestOtp({ phone: "+8801712345678", purpose: "register" });
    const verified = await verifyOtp({
      phone: "+8801712345678",
      otpCode: "654321",
      purpose: "register",
    });
    expect(verified.status).toBe("verified");

    const result = await register({
      locale: "bn",
      role: "student",
      fullName: "ডেমো শিক্ষার্থী",
      phone: "+8801712345678",
      otpCode: "654321",
      schoolId: "school_demo_high",
      sectionId: "sec_10_a_demo_high",
    });
    expect(result.user.status).toBe("PENDING");
    expect(result.verificationRequest.status).toBe("PENDING");
    expect(result.accessToken).toBeDefined();
    expect(fixtureSession().user?.status).toBe("PENDING");
    await expect(getMe()).resolves.toMatchObject({ status: "PENDING" });
  });

  it("register refuses without a previously verified OTP", async () => {
    await expect(
      register({
        locale: "bn",
        role: "student",
        fullName: "ডেমো",
        phone: "+8801712345678",
        schoolId: "s",
        sectionId: "x",
      }),
    ).rejects.toMatchObject({ code: "INVALID_OTP" });
  });

  it("patchMe updates the locale on the account", async () => {
    await loginPassword({ email: "demo@kusholconnect.edu", password: "demopassword" });
    await expect(patchMe({ locale: "en" })).resolves.toMatchObject({ locale: "en" });
  });
});

describe("flag-driven failures", () => {
  it("invalid_otp fails every verify; rate_limited caps resend with a countdown", async () => {
    fixtureFlags.set("invalid_otp");
    await requestOtp({ phone: "+8801712345678" });
    await expect(
      verifyOtp({ phone: "+8801712345678", otpCode: "123456", purpose: "register" }),
    ).rejects.toMatchObject({ code: "INVALID_OTP" });

    fixtureFlags.set("rate_limited");
    await expect(requestOtp({ phone: "+8801712345678" })).rejects.toMatchObject({
      code: "RATE_LIMITED",
      retryAfterSeconds: 60,
    });
  });

  it("suspended blocks login; login OTP answers unknown_phone without creating a session", async () => {
    fixtureFlags.set("suspended");
    await expect(
      loginPassword({ email: "demo@kusholconnect.edu", password: "demopassword" }),
    ).rejects.toMatchObject({
      code: "SUSPENDED",
    });

    fixtureFlags.set("unknown_phone");
    await requestOtp({ phone: "+8801912345678", purpose: "login" });
    await expect(
      verifyOtp({ phone: "+8801912345678", otpCode: "123456", purpose: "login" }),
    ).resolves.toEqual({ status: "unknown_phone" });
    expect(fixtureSession().user).toBeNull();
  });

  it("a wrong password answers UNAUTHENTICATED with no session", async () => {
    await expect(
      loginPassword({ email: "demo@kusholconnect.edu", password: "short" }),
    ).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    expect(fixtureSession().user).toBeNull();
  });
});

describe("token rotation", () => {
  it("rotates once; replaying the old token clears the session (family revoked)", async () => {
    await loginPassword({ email: "demo@kusholconnect.edu", password: "demopassword" });
    const first = fixtureSession().tokens;
    const rotated = await refreshTokens({ refreshToken: first?.refreshToken ?? "" });
    expect(rotated.refreshToken).not.toBe(first?.refreshToken);

    await expect(refreshTokens({ refreshToken: first?.refreshToken ?? "" })).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    expect(fixtureSession().tokens).toBeNull();
  });
});

describe("mid-session verification", () => {
  it("approving the demo request flips the gate open without re-login", async () => {
    await requestOtp({ phone: "+8801712345678" });
    await verifyOtp({ phone: "+8801712345678", otpCode: "123456", purpose: "register" });
    await register({
      locale: "bn",
      role: "student",
      fullName: "ডেমো শিক্ষার্থী",
      phone: "+8801712345678",
      schoolId: "school_demo_high",
      sectionId: "sec_10_a_demo_high",
    });

    fixtureRejectCurrentUser("নাম ও আইডি মিলছে না");
    await expect(getMe()).resolves.toMatchObject({ status: "PENDING" });

    fixtureApproveCurrentUser();
    await expect(getMe()).resolves.toMatchObject({ status: "VERIFIED" });
  });
});

describe("hierarchy fixtures (schema-typed master data)", () => {
  it("serves the fictional Dhaka (launch) + Chattogram cascade", async () => {
    const cities = await listCities();
    expect(cities.map((c) => c.nameEn)).toEqual(["Dhaka", "Chattogram"]);
    expect(cities[0]?.isLaunchCity).toBe(true);
    expect(cities[1]?.isLaunchCity).toBe(false);

    const dhakaSchools = await listSchools("city_dhaka");
    expect(dhakaSchools.map((s) => s.nameEn)).toEqual(["Demo High School", "Sample Model School"]);
    // Page payload is scoped by the path — rows carry no parent ids.
    expect(dhakaSchools.every((s) => !("cityId" in s))).toBe(true);

    const sections = await listSections("school_demo_high");
    expect(sections.map((s) => [s.classLevel, s.name])).toEqual([
      ["6", "A"],
      ["6", "B"],
      ["9", "A"],
      ["9", "B"],
      ["10", "A"],
    ]);

    await expect(listSchools("city_nonexistent")).resolves.toEqual([]);
    await expect(listSections("school_nonexistent")).resolves.toEqual([]);
  });
});

describe("school requests (missing institution)", () => {
  it("queues a PENDING request for the application admin", async () => {
    const created = await createSchoolRequest({
      name: "Fictional Engineering College",
      type: "college",
      cityId: "city_chattogram",
      address: "12 Demo Road",
      pocName: "ডেমো পিওসি",
      pocPhone: "+8801812345678",
      pocEmail: "poc@demo.example",
    });
    expect(created).toMatchObject({ status: "PENDING" });
    expect(created.id).toMatch(/^sr_demo_/);
  });

  it("flags conflict when a request for the institution is already in flight", async () => {
    fixtureFlags.setSchoolRequest("conflict");
    await expect(
      createSchoolRequest({
        name: "Fictional Engineering College",
        type: "college",
        cityId: "city_chattogram",
        pocName: "ডেমো পিওসি",
        pocPhone: "+8801812345678",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    fixtureFlags.setSchoolRequest("success");
    await expect(
      createSchoolRequest({
        name: "Fictional Engineering College",
        type: "college",
        cityId: "city_chattogram",
        pocName: "ডেমো পিওসি",
        pocPhone: "+8801812345678",
      }),
    ).resolves.toMatchObject({ status: "PENDING" });
  });

  it("refuses offline — the request must reach the application admin", async () => {
    fixtureFlags.set("offline");
    await expect(
      createSchoolRequest({
        name: "Fictional Engineering College",
        type: "school",
        cityId: "city_dhaka",
        pocName: "ডেমো পিওসি",
        pocPhone: "+8801812345678",
      }),
    ).rejects.toBeInstanceOf(FixtureError);
  });
});

describe("devices (P1)", () => {
  it("lists and revokes, but never the current device", async () => {
    await loginPassword({ email: "demo@kusholconnect.edu", password: "demopassword" });
    const devices = await getDevices();
    expect(devices.length).toBeGreaterThan(0);

    const current = devices.find((d) => d.current);
    const other = devices.find((d) => !d.current);
    if (current) await expect(revokeDevice(current.id)).rejects.toMatchObject({ code: "CONFLICT" });
    if (other) {
      await revokeDevice(other.id);
      await expect(getDevices()).resolves.toHaveLength(devices.length - 1);
    }
  });
});
