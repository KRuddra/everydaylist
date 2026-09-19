// @vitest-environment node
import bcrypt from "bcryptjs";
import { beforeAll, describe, expect, it } from "vitest";

import { env } from "@/lib/config/env";
import { InvalidCredentialsError } from "@/lib/errors/errors";

import { verifyPassword } from "./password";

/**
 * Generates a real bcrypt hash in-process for a throwaway password — per the
 * Stage 7 brief, this never reads a real secret (`env.APP_PASSWORD_HASH`'s
 * placeholder value, set by `vitest.setup.ts`, is overwritten here before
 * each test with a hash of a value only this test file knows).
 */
const KNOWN_PASSWORD = "correct-horse-battery-staple";
const WRONG_PASSWORD = "definitely-not-the-password";

describe("verifyPassword", () => {
  beforeAll(() => {
    env.APP_PASSWORD_HASH = bcrypt.hashSync(KNOWN_PASSWORD, 10);
  });

  it("resolves (does not throw) for the correct password", async () => {
    await expect(verifyPassword(KNOWN_PASSWORD)).resolves.toBeUndefined();
  });

  it("throws InvalidCredentialsError for an incorrect password", async () => {
    await expect(verifyPassword(WRONG_PASSWORD)).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("throws InvalidCredentialsError for an empty password", async () => {
    await expect(verifyPassword("")).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("is case-sensitive", async () => {
    await expect(verifyPassword(KNOWN_PASSWORD.toUpperCase())).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
