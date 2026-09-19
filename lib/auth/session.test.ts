// @vitest-environment node
import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { env } from "@/lib/config/env";

import { issueSessionToken, verifySessionToken } from "./session";

// Mirrors `session.ts`'s own `encodedSecret` construction, so this file can
// hand-craft tokens (expired/tampered) signed with the exact same secret
// `verifySessionToken` will check against. `env.AUTH_SECRET` is a
// non-secret placeholder set by `vitest.setup.ts`, never a real secret.
const encodedSecret = new TextEncoder().encode(env.AUTH_SECRET);

describe("issueSessionToken / verifySessionToken", () => {
  it("round-trips: a freshly issued token verifies successfully", async () => {
    const token = await issueSessionToken();
    expect(await verifySessionToken(token)).toBe(true);
  });

  it("rejects an empty/garbage string", async () => {
    expect(await verifySessionToken("not-a-jwt")).toBe(false);
  });

  it("rejects an expired token", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expired = await new SignJWT({ authenticated: true })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(nowSeconds - 120)
      .setExpirationTime(nowSeconds - 60)
      .sign(encodedSecret);

    expect(await verifySessionToken(expired)).toBe(false);
  });

  it("rejects a token tampered with after signing", async () => {
    const token = await issueSessionToken();
    const [header, payload, signature] = token.split(".");
    // Flip the last character of the signature segment so the signature no
    // longer matches the (unchanged) header/payload.
    const tamperedSignature = signature.slice(0, -1) + (signature.endsWith("A") ? "B" : "A");
    const tampered = `${header}.${payload}.${tamperedSignature}`;

    expect(await verifySessionToken(tampered)).toBe(false);
  });

  it("rejects a token signed with a different secret", async () => {
    const otherSecret = new TextEncoder().encode("a-completely-different-secret-value-32chars");
    const token = await new SignJWT({ authenticated: true })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(otherSecret);

    expect(await verifySessionToken(token)).toBe(false);
  });

  it("rejects a validly signed token missing the `authenticated` claim", async () => {
    const token = await new SignJWT({ authenticated: false })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(encodedSecret);

    expect(await verifySessionToken(token)).toBe(false);
  });
});
