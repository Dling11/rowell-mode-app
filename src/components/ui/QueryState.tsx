"use client";
export function QueryState({loading,error,retry}:{loading?:boolean;error?:unknown;retry:()=>void}) {
  if (loading) return <p className="notice" role="status">Loading your workspace…</p>;
  if (error) return <div className="notice" role="alert"><p>We couldn’t load this section. Your saved records haven’t changed.</p><button className="button secondary" style={{marginTop:15}} onClick={retry}>Try again</button></div>;
  return null;
}
