export function safeDecodeURIComponent(value: string, fallback = ""): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return fallback;
  }
}
