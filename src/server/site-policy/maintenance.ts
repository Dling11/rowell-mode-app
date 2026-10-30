export function maintenanceHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>A little work in progress · Rowell</title><style>body{margin:0;background:#0b1220;color:#eaf1f8;font:16px/1.7 Arial,sans-serif;min-height:100dvh;display:grid;place-items:center}main{max-width:560px;padding:40px 24px}span{color:#8fafd1;font-size:12px;letter-spacing:.16em}h1{font-size:clamp(32px,6vw,52px);font-weight:500;line-height:1.15;letter-spacing:-.04em}p{color:#a6b5c7}a{color:#a8c5e5;display:inline-block;padding:14px 0;margin-right:24px}a:focus-visible{outline:2px solid #a8c5e5;outline-offset:5px}</style></head><body><main><span>ROWELL / NIKUSHIMI</span><h1>A little work<br>in progress.</h1><p>Updates in progress. Please check back soon.<br>Downloads are temporarily unavailable.</p><a href="/">Check again</a><a href="/admin">Owner access</a></main></body></html>`;
}

export function downloadUnavailableHtml() {
  return maintenanceHtml()
    .replace("A little work in progress · Rowell", "Downloads are taking a moment · Rowell")
    .replace("A little work<br>in progress.", "Downloads are<br>taking a moment.")
    .replace("Updates in progress. Please check back soon.<br>Downloads are temporarily unavailable.", "This download is temporarily unavailable.<br>You can keep exploring the projects and check back soon.")
    .replace('<a href="/">Check again</a>', '<a href="/projects">Explore projects</a>');
}
