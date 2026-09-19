"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, MoreVertical, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { replayIOSInstallHint } from "@/components/shell/IOSInstallHint";
import { useLogout } from "@/lib/query/hooks/useAuth";

/**
 * Header overflow menu — "Install app" (replays `IOSInstallHint`) and
 * "Logout". Kept separate from `ExportButton` specifically so export stays
 * one-tap (`docs/UI_SPEC.md` §1). Not one of the 25 inventoried components;
 * split out from `(app)/layout.tsx` because it needs mutation hooks
 * (`useLogout`), which only work inside a client component.
 */
export function OverflowMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useLogout();

  function handleInstallHint() {
    replayIOSInstallHint();
    setOpen(false);
  }

  async function handleLogout() {
    setOpen(false);
    try {
      await logout.mutateAsync();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Logout failed. Try again.");
      return;
    }
    queryClient.clear();
    router.push("/login");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="icon" aria-label="More options" />}>
        <MoreVertical className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 gap-1 p-1">
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleInstallHint}>
          <Smartphone className="size-4" aria-hidden="true" />
          Install app
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
          disabled={logout.isPending}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Logout
        </Button>
      </PopoverContent>
    </Popover>
  );
}
