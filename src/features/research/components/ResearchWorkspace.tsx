"use client";
import { useState, type FormEvent } from "react";
import { BookMarked, Plus, Search, ArrowUpRight, RefreshCw, Pencil, Trash2, FolderGit2, ShieldCheck, Copy, Code2 } from "lucide-react";
import { toast } from "sonner";
import { researchApi } from "../api/research-api";
import { researchStatuses, type ResearchItem } from "../model/schema";
import { ResearchEditor } from "./ResearchEditor";
import { ActionButton } from "@/components/ui/ActionButton";
import { QueryState } from "@/components/ui/QueryState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PhotoPreview } from "@/components/media/PhotoPreview";
import { errorMessage } from "@/lib/errors";
import workspace from "@/components/workspace/Workspace.module.css";
import styles from "./Research.module.css";

const date = (value: string) => new Date(value).toLocaleString();
export function ResearchWorkspace() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const query = researchApi.useResearchQuery({ page, q, status });
  const [selected, setSelected] = useState<ResearchItem | null>(null);
  const active = selected || query.data?.items[0] || null;
  const [editor, setEditor] = useState<{ item: ResearchItem | null } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState("");
  const [check, { isLoading: checking }] = researchApi.useCheckResearchMutation();
  const [remove, { isLoading: removing }] = researchApi.useDeleteResearchMutation();
  const busy = checking || removing;
  function filter(event: FormEvent) { event.preventDefault(); setQuery(search.trim()); setPage(1); setSelected(null); }
  async function refresh() {
    if (!active) return;
    setError("");
    try { setSelected(await check({ id: active.id, updatedAt: active.updatedAt }).unwrap()); toast.success("GitHub details refreshed"); }
    catch (error) { const message = errorMessage(error); setError(message); toast.error(message); }
  }
  async function deleteEntry() {
    if (!active) return;
    try { await remove({ id: active.id, updatedAt: active.updatedAt }).unwrap(); setSelected(null); setDeleteOpen(false); toast.success("Research entry removed"); }
    catch (error) { setError(errorMessage(error)); setDeleteOpen(false); }
  }
  const image = active?.screenshotMediaId ? `/api/admin/uploads/${active.screenshotMediaId}/preview` : active?.screenshotUrl;
  const changed = Boolean(active?.snapshotCommit && active.upstream && active.snapshotCommit !== active.upstream.latestCommit);
  return <>
    <header className={`${workspace.heading} ${styles.heading}`}><div><p className="eyebrow">A PLACE TO COME BACK TO</p><h1>Research & plans.</h1><p>Interesting projects, saved sources and the ideas you don’t want to lose. Private to you.</p></div><button className="button" onClick={() => setEditor({ item: null })}><Plus size={16}/>Save a project</button></header>
    <div className={styles.filters}><form role="search" onSubmit={filter}><label className="sr-only" htmlFor="research-search">Search research</label><input id="research-search" className="input" placeholder="Find a project, topic or idea…" maxLength={80} value={search} onChange={(event) => setSearch(event.target.value)}/><button className="button secondary" aria-label="Search research"><Search size={17}/></button></form><label className="field">Stage<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); setSelected(null); }}><option value="">All stages</option>{researchStatuses.map((stage) => <option key={stage}>{stage}</option>)}</select></label></div>
    <QueryState loading={query.isLoading} fetching={query.isFetching} error={query.error} retry={query.refetch}/>
    {!query.isLoading && !query.error && query.data?.items.length === 0 && <div className={styles.empty}><BookMarked size={32}/><h2>{q || status ? "No matching entries." : "Keep your next idea here."}</h2><p>{q || status ? "Try another search or stage." : "Save a repository, why it caught your eye and what you want to try next."}</p><button className="button secondary" onClick={() => setEditor({ item: null })}>Save your first project</button></div>}
    {active && <div className={styles.layout}>
      <aside className={styles.list} aria-label="Saved research projects">{query.data?.items.map((item) => <button key={item.id} className={styles.card} aria-pressed={active.id === item.id} onClick={() => { setSelected(item); setError(""); }} disabled={busy}><span className={styles.stage}>{item.status}</span><strong>{item.title}</strong><span className={styles.repo}>{new URL(item.repositoryUrl).pathname.slice(1)}</span><p>{item.summary || "Open your saved notes."}</p><span className={styles.tags}>{item.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</span></button>)}<div className={styles.actions}><button className="button secondary" disabled={page === 1 || query.isFetching} onClick={() => { setPage((page) => page - 1); setSelected(null); }}>Previous</button><button className="button secondary" disabled={!query.data?.nextPage || query.isFetching} onClick={() => { setPage(query.data!.nextPage!); setSelected(null); }}>Next</button></div></aside>
      <article className={styles.detail}>
        {image ? <div className={styles.image}><PhotoPreview src={image} alt={`${active.title} reference screenshot`} caption={`${active.title} · reference image`} fit="contain"/></div> : <div className={styles.placeholder}><FolderGit2 size={48}/><span>SAVED FOR LATER</span></div>}
        <div className={styles.detailBody}><div className={styles.title}><div><p className="eyebrow">PRIVATE RESEARCH</p><h2>{active.title}</h2></div><span className={styles.stage}>{active.status}</span></div><p className={styles.summary}>{active.summary}</p><div className={styles.tags}>{active.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <div className={styles.actions}><a className="button secondary" href={active.repositoryUrl} target="_blank" rel="noreferrer"><Code2 size={16}/>GitHub <ArrowUpRight size={13}/></a>{active.websiteUrl && <a className="text-link" href={active.websiteUrl} target="_blank" rel="noreferrer">Website / guide <ArrowUpRight size={13}/></a>}<button className="text-link" disabled={busy} onClick={() => setEditor({ item: active })}><Pencil size={14}/>Edit entry</button><button className={styles.remove} disabled={busy} onClick={() => setDeleteOpen(true)} aria-label="Remove research entry"><Trash2 size={15}/></button></div>
          {active.notes && <section className={styles.section}><h3>Why I saved this & next steps</h3><p className={styles.prose}>{active.notes}</p></section>}
          <section className={styles.section}><h3><FolderGit2 size={17}/> Saved source</h3><dl className={styles.metadata}><div><dt>Version</dt><dd>{active.snapshotVersion || "Not recorded"}</dd></div><div><dt>License</dt><dd>{active.license || "Not recorded"}</dd></div>{active.snapshotCommit && <div><dt>Source commit</dt><dd><a href={`${active.repositoryUrl}/commit/${active.snapshotCommit}`} target="_blank" rel="noreferrer">{active.snapshotCommit.slice(0, 12)} <ArrowUpRight size={12}/></a></dd></div>}</dl>{active.localPath && <div className={styles.path}><code>{active.localPath}</code><button className="text-link" aria-label="Copy source folder" onClick={async () => { try { await navigator.clipboard.writeText(active.localPath); toast.success("Source folder copied"); } catch { toast.error("Copy the displayed folder path manually."); } }}><Copy size={15}/></button></div>}</section>
          {active.setupNotes && <section className={styles.section}><h3>Setup & requirements</h3><p className={styles.prose}>{active.setupNotes}</p></section>}
          {active.reviewNotes && <section className={styles.section}><h3><ShieldCheck size={17}/> Review notes</h3><p className={styles.prose}>{active.reviewNotes}</p></section>}
          <section className={`${styles.section} ${styles.upstream}`}><h3>Upstream watch</h3><p className={styles.muted}>Check when you’re ready to revisit. This refreshes repository details and keeps your saved source untouched.</p>{active.upstream ? <dl className={styles.metadata}><div><dt>Checked</dt><dd>{date(active.upstream.checkedAt)}</dd></div><div><dt>Public release</dt><dd>{active.upstream.release ? <a href={`${active.repositoryUrl}/releases/tag/${encodeURIComponent(active.upstream.release.tag)}`} target="_blank" rel="noreferrer">{active.upstream.release.tag}{active.upstream.release.prerelease ? " · Preview" : ""} <ArrowUpRight size={12}/></a> : "No public release"}</dd></div><div><dt>Upstream branch</dt><dd>{active.upstream.defaultBranch} · {active.upstream.latestCommit.slice(0, 8)}{active.upstream.archived ? " · Archived" : ""}</dd></div></dl> : <p className={styles.muted}>Not checked yet.</p>}{changed && <p className={styles.changed}><a href={`${active.repositoryUrl}/compare/${active.snapshotCommit}...${active.upstream!.latestCommit}`} target="_blank" rel="noreferrer">Upstream has new source changes. Review the comparison <ArrowUpRight size={12}/></a></p>}<ActionButton pending={checking} className="button secondary" disabled={busy} onClick={refresh}><RefreshCw size={15}/>Check GitHub</ActionButton>{error && <p role="alert" className="error-text">{error}</p>}</section>
          <p className={styles.footnote}>Saved {date(active.createdAt)} · Updated {date(active.updatedAt)}</p>
        </div>
      </article>
    </div>}
    {editor && <ResearchEditor item={editor.item} onClose={() => setEditor(null)} onSaved={(item) => { setSelected(item); setEditor(null); }}/>}<ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Remove this research entry?" description="This removes the saved reminder and notes. Your local source files and the upstream repository are kept." label="Remove entry" busy={removing} onConfirm={deleteEntry}/>
  </>;
}
