import bcrypt from "bcryptjs";

import { env } from "@/lib/config/env";
import { InvalidCredentialsError } from "@/lib/errors/errors";

/** Verifies `password` against `APP_PASSWORD_HASH`. Throws `InvalidCredentialsError` on mismatch. */
export async function verifyPassword(password: string): Promise<void> {
  const matches = await bcrypt.compare(password, env.APP_PASSWORD_HASH);
  if (!matches) {
    throw new InvalidCredentialsError();
  }
}
