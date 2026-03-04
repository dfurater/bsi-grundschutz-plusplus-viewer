const SAFE_EXTERNAL_PROTOCOLS = new Set(["http:", "https:"]);
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

export function safeExternalUrl(input: string | null | undefined): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed || CONTROL_CHARACTERS.test(trimmed)) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const protocol = parsed.protocol.toLowerCase();
  if (!SAFE_EXTERNAL_PROTOCOLS.has(protocol)) {
    return null;
  }

  if (parsed.username || parsed.password) {
    return null;
  }

  return parsed.toString();
}
