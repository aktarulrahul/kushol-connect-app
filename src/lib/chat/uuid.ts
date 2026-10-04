// UUID v4 for `client_msg_id` (BR-008 / validation.chat.client_msg_id): Hermes has no global
// crypto.randomUUID on all our targets, so the generator prefers crypto.getRandomValues and
// falls back to Math.random — client message ids are correlation keys, not secrets; the server
// validates the v4 shape.
const HEX = "0123456789abcdef";

function randomHex(count: number): string {
  const out = new Array<string>(count);
  const cryptoObj = typeof crypto !== "undefined" ? crypto : undefined;
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(count);
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < count; i += 1) {
      const byte = bytes[i] ?? 0;
      out[i] = HEX[byte & 0xf] ?? "0";
    }
    return out.join("");
  }
  for (let i = 0; i < count; i += 1) {
    out[i] = HEX[Math.floor(Math.random() * 16)] ?? "0";
  }
  return out.join("");
}

/** RFC-4122 v4: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` with y ∈ {8,9,a,b}. */
export function uuidv4(): string {
  return (
    randomHex(8) +
    "-" +
    randomHex(4) +
    "-4" +
    randomHex(3) +
    "-" +
    ("89ab".charAt(Math.floor(Math.random() * 4)) || "8") +
    randomHex(3) +
    "-" +
    randomHex(12)
  );
}
