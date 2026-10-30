"use client";
import { useTransition, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { ActionButton } from "./ActionButton";
import { NavigationFeedback } from "./NavigationFeedback";

export function SearchForm({ action, children, submitLabel, submitClassName, ...props }: Omit<ComponentProps<"form">, "action" | "onSubmit" | "method"> & { action: string; submitLabel: string; submitClassName?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <>
      <form {...props} action={action} method="get" aria-busy={pending} onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const params = new URLSearchParams();
        new FormData(event.currentTarget).forEach((value, key) => { if (typeof value === "string") params.append(key, value); });
        startTransition(() => router.push(`${action}?${params}`));
      }}>
        {children}
        <ActionButton type="submit" className={submitClassName} aria-label={submitLabel} pending={pending}><Search size={17} /></ActionButton>
      </form>
      <NavigationFeedback pending={pending} label="Finding matches…" />
    </>
  );
}
