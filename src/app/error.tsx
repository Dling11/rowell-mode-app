"use client";
export default function ErrorPage({reset}:{reset:()=>void}) { return <main id="main" className="container"><div className="page-intro"><p className="eyebrow">A SMALL HICCUP</p><h1>Let’s try that again.</h1><p>This page couldn’t be loaded. Your changes haven’t been submitted.</p><button className="button" onClick={reset} style={{marginTop:24}}>Try again</button></div></main>; }
