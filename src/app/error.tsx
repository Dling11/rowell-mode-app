"use client";
import { useTransition } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
export default function ErrorPage({reset}:{reset:()=>void}) {
  const [pending, startTransition] = useTransition();
  return <main id="main" className="container"><div className="page-intro"><p className="eyebrow">A SMALL HICCUP</p><h1>Let’s try that again.</h1><p>This page couldn’t be loaded. Your changes haven’t been submitted.</p><ActionButton pending={pending} className="button" onClick={() => startTransition(reset)} style={{marginTop:24}}>{pending ? "Retrying…" : "Try again"}</ActionButton></div></main>;
}
