"use client";
import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { NavigationFeedback } from "./NavigationFeedback";

function LinkFeedback() {
  const { pending } = useLinkStatus();
  return <NavigationFeedback pending={pending} />;
}

export default function AppLink({ children, ...props }: ComponentProps<typeof Link>) {
  const pathname = typeof props.href === "string" ? props.href.split(/[?#]/)[0] : props.href.pathname;
  const privateDestination = pathname === "/install" || pathname === "/admin" || pathname?.startsWith("/admin/");
  return <Link {...props} prefetch={privateDestination ? false : props.prefetch}>{children}<LinkFeedback /></Link>;
}
