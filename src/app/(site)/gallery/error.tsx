"use client";
export default function GalleryError({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="container" style={{ paddingBlock: 80 }}>
      <h1>The gallery couldn’t load.</h1>
      <p>Please try again.</p>
      <button className="button secondary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
