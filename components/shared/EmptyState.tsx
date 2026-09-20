"use client";

import { AlertTriangle, Inbox, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  /** `"error"` renders `role="alert"` and defaults the icon to a warning triangle. */
  variant?: "empty" | "error";
  icon?: LucideIcon;
  title: string;
  description?: string;
  onRetry?: () => void;
}

/**
 * Generic empty/error placeholder — used by every screen's per-section empty
 * state, "no results", and error-with-retry states (`docs/UI_SPEC.md` §5).
 */
export function EmptyState({ variant = "empty", icon, title, description, onRetry }: EmptyStateProps) {
  const Icon = icon ?? (variant === "error" ? AlertTriangle : Inbox);

  return (
    <div
      role={variant === "error" ? "alert" : undefined}
      className="flex flex-col items-center gap-2 py-12 text-center"
    >
      <Icon className="size-10 text-muted-foreground/70" aria-hidden="true" />
      <p className="text-base font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-xs text-sm text-muted-foreground">{description}</p> : null}
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Retry
        </Button>
      ) : null}
    </div>
  );
}
