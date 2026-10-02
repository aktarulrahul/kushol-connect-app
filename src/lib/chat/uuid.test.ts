import { uuidv4 } from "@/lib/chat/uuid";

describe("uuidv4", () => {
  it("returns an RFC-4122 v4 shape without using global crypto.randomUUID", () => {
    const id = uuidv4();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
