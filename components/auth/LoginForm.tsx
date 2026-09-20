"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock, Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/errors";
import { useLogin } from "@/lib/query/hooks/useAuth";
import { useOnlineStatus } from "@/lib/query/useOnlineStatus";

/**
 * The API's `RATE_LIMITED` error carries no `retryAfter` value
 * (`errorResponseSchema` only has `code`/`message` — see
 * `docs/API_CONTRACT.md`'s Error Taxonomy), so an exact server-verified
 * countdown isn't possible without a backend contract change, which is out
 * of scope here. This is a client-side heuristic cooldown *display* only —
 * if the real server window is longer, the next attempt simply re-locks
 * with a fresh countdown; it never falsely claims precision it doesn't have.
 */
const RATE_LIMIT_COOLDOWN_SECONDS = 60;

type FormState = "idle" | "loading" | "invalid" | "locked";

/** Single shared-password gate — all states from `docs/UI_SPEC.md` §2.5. */
export function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const isOnline = useOnlineStatus();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state !== "locked" || secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) {
          setState("idle");
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [state, secondsRemaining]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "loading" || state === "locked") return;

    setState("loading");
    try {
      await login.mutateAsync(password);
      router.push("/");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === "RATE_LIMITED") {
        setState("locked");
        setSecondsRemaining(RATE_LIMIT_COOLDOWN_SECONDS);
        return;
      }
      setErrorMessage(error instanceof ApiError ? error.message : "Incorrect password. Try again.");
      setState("invalid");
      passwordInputRef.current?.focus();
    }
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = String(secondsRemaining % 60).padStart(2, "0");
  const isLoading = state === "loading";
  const isLocked = state === "locked";
  const disabled = isLoading || isLocked || !isOnline;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold">Everyday List</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                ref={passwordInputRef}
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                autoFocus
                required
                disabled={disabled}
                aria-invalid={state === "invalid" || undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pr-9"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute top-0.5 right-0.5"
                onClick={() => setShowPassword((current) => !current)}
                disabled={disabled}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={disabled}>
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Unlocking…
              </>
            ) : (
              "Unlock"
            )}
          </Button>

          {state === "invalid" ? (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              {errorMessage}
            </p>
          ) : null}

          {isLocked ? (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <Clock className="size-4 shrink-0" aria-hidden="true" />
              {/* Static text so the alert announces once on entry, not every countdown tick. */}
              <span role="alert">Too many attempts. Try again shortly.</span>
              <span aria-hidden="true">
                ({minutes}:{seconds})
              </span>
            </p>
          ) : null}

          {!isOnline && !isLocked ? (
            <p className="text-sm text-muted-foreground">Login requires a connection.</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
