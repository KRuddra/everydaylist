"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Debounced (by the caller — see `hooks/useDebouncedValue.ts`) search field with a leading icon and a clear button. */
export function SearchInput({ value, onChange, disabled }: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder="Search tasks and comments…"
        aria-label="Search tasks and comments"
        className="pr-8 pl-8 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
      />
      {value.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-1 -translate-y-1/2"
        >
          <X className="size-3.5" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
