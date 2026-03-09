import { describe, expect, it } from "vitest";
import { isPlaceholderValue } from "./placeholders";

describe("isPlaceholderValue", () => {
  it("returns true for template placeholders", () => {
    expect(isPlaceholderValue("{{OPERATOR_NAME}}")).toBe(true);
  });

  it("returns false for normal values", () => {
    expect(isPlaceholderValue("Example Operator GmbH")).toBe(false);
  });
});
