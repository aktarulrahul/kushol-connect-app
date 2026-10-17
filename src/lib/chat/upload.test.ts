import { uploadAsync } from "expo-file-system/legacy";

import { ChatFixtureError } from "@/fixtures/chat-error";
import { liveAuth } from "@/lib/auth/live-session";
import { tokenStore } from "@/lib/auth/token-store";

import { uploadMediaLive, uploadQuery } from "./live-chat";

// 05 · owner 2026-10-17 — the app uploads attachments to the api (which sniffs them and streams
// them to R2); it never talks to storage.

jest.mock("expo-file-system/legacy", () => ({
  FileSystemUploadType: { BINARY_CONTENT: 0, MULTIPART: 1 },
  uploadAsync: jest.fn(),
  getInfoAsync: jest.fn(),
}));

const mockedUpload = jest.mocked(uploadAsync);

const asset = {
  id: "asset-1",
  kind: "image",
  mime: "image/jpeg",
  sizeBytes: 812_345,
  width: 1080,
  height: 1440,
  status: "confirmed",
  createdAt: "2026-10-17T09:00:00Z",
};

function answer(status: number, body: unknown) {
  return { status, body: JSON.stringify(body), headers: {}, mimeType: "application/json" };
}

beforeEach(() => {
  mockedUpload.mockReset();
  jest.spyOn(tokenStore, "get").mockResolvedValue({ accessToken: "tok-1", refreshToken: "r-1" });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const photo = {
  kind: "image" as const,
  headerBytes: new Uint8Array([0xff, 0xd8, 0xff]),
  sizeBytes: 1,
  fileName: "photo.jpg",
  width: 1080,
  height: 1440,
  uri: "file:///data/photo.jpg",
};

describe("uploadQuery", () => {
  it("sends the kind and the optional name and dimensions only when known", () => {
    expect(uploadQuery(photo)).toEqual({
      kind: "image",
      fileName: "photo.jpg",
      width: 1080,
      height: 1440,
    });
    expect(
      uploadQuery({
        kind: "voice",
        headerBytes: new Uint8Array(0),
        sizeBytes: 1,
        durationMs: 4200,
      }),
    ).toEqual({ kind: "voice", durationMs: 4200 });
  });
});

describe("uploadMediaLive (device file)", () => {
  it("streams the file to the api with the bearer, never to storage", async () => {
    mockedUpload.mockResolvedValueOnce(answer(201, asset));
    const ref = await uploadMediaLive(photo);
    expect(ref).toMatchObject({ assetId: "asset-1", mime: "image/jpeg", status: "confirmed" });
    const [url, uri, options] = mockedUpload.mock.calls[0] ?? [];
    expect(url).toBe(
      "http://api.test/api/v1/media/upload?kind=image&fileName=photo.jpg&width=1080&height=1440",
    );
    expect(uri).toBe("file:///data/photo.jpg");
    expect(options).toMatchObject({
      httpMethod: "POST",
      headers: {
        Authorization: "Bearer tok-1",
        "Content-Type": "application/octet-stream",
        "X-Kushol-Client": "mobile",
      },
    });
  });

  it("rotates once on a 401 and retries with the new token", async () => {
    const rotate = jest.spyOn(liveAuth(), "rotate").mockResolvedValue();
    jest
      .spyOn(tokenStore, "get")
      .mockResolvedValueOnce({ accessToken: "tok-1", refreshToken: "r-1" })
      .mockResolvedValueOnce({ accessToken: "tok-1", refreshToken: "r-1" })
      .mockResolvedValue({ accessToken: "tok-2", refreshToken: "r-2" });
    mockedUpload
      .mockResolvedValueOnce(answer(401, { code: "UNAUTHENTICATED", status: 401 }))
      .mockResolvedValueOnce(answer(201, asset));
    await uploadMediaLive(photo);
    expect(rotate).toHaveBeenCalledTimes(1);
    expect(mockedUpload).toHaveBeenCalledTimes(2);
    expect(mockedUpload.mock.calls[1]?.[2]?.headers?.Authorization).toBe("Bearer tok-2");
  });

  it("maps the api's problems onto the chat error codes", async () => {
    mockedUpload.mockResolvedValueOnce(
      answer(400, { code: "VALIDATION_FAILED", status: 400, title: "Bad Request" }),
    );
    await expect(uploadMediaLive(photo)).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    mockedUpload.mockRejectedValueOnce(new Error("network down"));
    await expect(uploadMediaLive(photo)).rejects.toBeInstanceOf(ChatFixtureError);
  });
});
