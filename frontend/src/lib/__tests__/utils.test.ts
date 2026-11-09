import { describe, expect, it } from "vitest";
import { cn, urlBase64ToUint8Array } from "@/lib/utils";

describe("urlBase64ToUint8Array", () => {
  it("decodes unpadded base64url", () => {
    // "hello" -> base64 "aGVsbG8=" -> base64url unpadded "aGVsbG8"
    const arr = urlBase64ToUint8Array("aGVsbG8");
    expect([...arr]).toEqual([104, 101, 108, 108, 111]);
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
