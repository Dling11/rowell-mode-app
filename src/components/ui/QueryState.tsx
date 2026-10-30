"use client";
import { LoadingState } from "./LoadingState";
import { ActionButton } from "./ActionButton";
export function QueryState({loading,fetching,error,retry}:{loading?:boolean;fetching?:boolean;error?:unknown;retry:()=>void}) {
  if (loading) return <LoadingState label="Loading your workspace…" />;
  if (error) return <div className="notice" role="alert"><p>We couldn’t load this section. Your saved records haven’t changed.</p><ActionButton pending={fetching} className="button secondary" style={{marginTop:15}} onClick={retry}>{fetching ? "Retrying…" : "Try again"}</ActionButton></div>;
  return fetching ? <LoadingState compact label="Refreshing your workspace…" /> : null;
}
